import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { translateApiError } from '../../../lib/api/translate';
import type { ParkingLot } from '../mock';
import {
  dayLabel,
  dayOfIso,
  entryTimeOptions,
  exitDateTimeOptions,
  monthKeyOf,
  reservationDates,
  timeOfIso,
} from '../reservationTime';
import type { DriverQuote } from '../services/driver';
import { newReservationId } from '../services/reservations';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import {
  describeVehicle,
  formatPlate,
  pickReservationVehicle,
  type DriverVehicle,
} from '../vehicles';
import { DriverIcon, vehicleIconName } from './DriverIcon';
import { CalendarMonth, MomentField, TimeWheel } from './ReservationDateTime';

const DEFAULT_STAY_SLOTS = 4;

type Expanded = 'entry' | 'exit' | null;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

type Props = {
  parking: ParkingLot;
  vehicles: DriverVehicle[];
  onCancel: () => void;
  onQuote: (input: { entryAt: string; exitAt: string }) => Promise<DriverQuote>;
  /**
   * Crea la reserva. `reservationId` es la clave de idempotencia: la misma en
   * todos los reintentos de este modal. Si rechaza, el modal queda abierto.
   */
  onConfirm: (input: {
    reservationId: string;
    parking: ParkingLot;
    vehicle: DriverVehicle;
    quote: DriverQuote;
  }) => Promise<void>;
  onManageVehicles: () => void;
};

export function ReservationModal({
  parking,
  vehicles,
  onCancel,
  onQuote,
  onConfirm,
  onManageVehicles,
}: Props) {
  const [selectedId, setSelectedId] = useState(
    () => pickReservationVehicle(vehicles)?.id,
  );
  // Una clave por apertura del modal: un doble toque o un reintento después de
  // un timeout no duplican la reserva.
  const [reservationId] = useState(newReservationId);
  const [confirming, setConfirming] = useState(false);
  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === selectedId) ?? null;
  const dates = useMemo(
    () => reservationDates(parking.reservationMaxDaysAhead),
    [parking.reservationMaxDaysAhead],
  );
  const firstAvailableDate = useMemo(
    () =>
      dates.find(
        (date) => entryTimeOptions(date, parking.schedules).length > 0,
      ) ?? dates[0],
    [dates, parking.schedules],
  );
  const [selectedDateKey, setSelectedDateKey] = useState(
    firstAvailableDate?.key,
  );
  const selectedDate =
    dates.find((date) => date.key === selectedDateKey) ?? firstAvailableDate;
  const entries = useMemo(
    () =>
      selectedDate ? entryTimeOptions(selectedDate, parking.schedules) : [],
    [parking.schedules, selectedDate],
  );
  const [entryAt, setEntryAt] = useState<string>();
  const selectedEntry = entries.find((option) => option.iso === entryAt);
  const exits = useMemo(
    () =>
      selectedDate && selectedEntry
        ? exitDateTimeOptions(
            selectedDate,
            selectedEntry.minute,
            parking.schedules,
          )
        : [],
    [parking.schedules, selectedDate, selectedEntry],
  );
  const [exitAt, setExitAt] = useState<string>();
  const [expanded, setExpanded] = useState<Expanded>(null);

  // Calendario de ingreso: los días de la ventana de reserva con algún horario.
  const entryDateKeys = useMemo(
    () =>
      new Set(
        dates
          .filter(
            (date) => entryTimeOptions(date, parking.schedules).length > 0,
          )
          .map((date) => date.key),
      ),
    [dates, parking.schedules],
  );
  const entryMonths = useMemo(
    () => unique(dates.map((date) => monthKeyOf(date.key))),
    [dates],
  );
  const [entryMonth, setEntryMonth] = useState(() =>
    monthKeyOf(firstAvailableDate?.key ?? dates[0]?.key ?? ''),
  );
  const entryWheel = useMemo(
    () => entries.map((option) => ({ key: option.iso, label: option.label })),
    [entries],
  );

  // Calendario de egreso: los días a los que llega alguna salida posible (la
  // estadía puede terminar al día siguiente).
  const exitDayKey = exitAt ? dayOfIso(exitAt) : undefined;
  const exitDateKeys = useMemo(
    () => new Set(exits.map((option) => dayOfIso(option.iso))),
    [exits],
  );
  const exitMonths = useMemo(
    () => unique([...exitDateKeys].map(monthKeyOf)),
    [exitDateKeys],
  );
  const [exitMonth, setExitMonth] = useState<string>();
  const shownExitMonth =
    exitMonth ?? (exitDayKey ? monthKeyOf(exitDayKey) : entryMonth);
  const exitWheel = useMemo(
    () =>
      exits
        .filter((option) => dayOfIso(option.iso) === exitDayKey)
        .map((option) => ({ key: option.iso, label: timeOfIso(option.iso) })),
    [exits, exitDayKey],
  );

  function selectExitDay(dayKey: string) {
    const sameDay = exits.filter((option) => dayOfIso(option.iso) === dayKey);
    const keepTime = exitAt ? timeOfIso(exitAt) : undefined;
    const next =
      sameDay.find((option) => timeOfIso(option.iso) === keepTime) ??
      sameDay[0];
    if (next) setExitAt(next.iso);
  }

  const [quote, setQuote] = useState<DriverQuote | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    setEntryAt(entries[0]?.iso);
  }, [entries]);

  // El mes del calendario sigue al día elegido.
  useEffect(() => {
    if (selectedDate) setEntryMonth(monthKeyOf(selectedDate.key));
  }, [selectedDate]);
  useEffect(() => {
    setExitMonth(undefined);
  }, [exitDayKey]);

  // Egreso sugerido: 2 h después del ingreso (4 franjas de 30 min), o el
  // último posible si la playa cierra antes.
  useEffect(() => {
    setExitAt((exits[DEFAULT_STAY_SLOTS - 1] ?? exits[exits.length - 1])?.iso);
  }, [exits]);

  useEffect(() => {
    if (!entryAt || !exitAt) {
      setQuote(null);
      return;
    }
    let active = true;
    setQuotePending(true);
    setQuote(null);
    setQuoteError(null);
    void onQuote({ entryAt, exitAt })
      .then((result) => {
        if (!active) return;
        setQuote(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setQuote(null);
        setQuoteError(translateApiError(error, { endpoint: 'driver.quote' }));
      })
      .finally(() => {
        if (active) setQuotePending(false);
      });
    return () => {
      active = false;
    };
  }, [entryAt, exitAt, onQuote]);

  const canConfirm = Boolean(selectedVehicle && quote) && !confirming;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.icon}>
              <DriverIcon
                name="calendar"
                size={28}
                color={driverColors.brand}
              />
            </View>
            <Text style={styles.title}>Confirmar reserva</Text>
            <Text style={styles.parking}>{parking.name}</Text>
            <Text style={styles.detail}>{parking.openUntil}</Text>

            <View style={styles.moments}>
              <MomentField
                label="Ingreso"
                dateText={selectedDate ? dayLabel(selectedDate.key) : '—'}
                timeText={entryAt ? timeOfIso(entryAt) : '—'}
                expanded={expanded === 'entry'}
                disabled={entryDateKeys.size === 0}
                onToggle={() => {
                  setExpanded((current) =>
                    current === 'entry' ? null : 'entry',
                  );
                }}
              >
                <CalendarMonth
                  monthKey={entryMonth}
                  enabledKeys={entryDateKeys}
                  selectedKey={selectedDate?.key}
                  onSelect={setSelectedDateKey}
                  onPrev={monthStep(entryMonths, entryMonth, -1, setEntryMonth)}
                  onNext={monthStep(entryMonths, entryMonth, 1, setEntryMonth)}
                />
                <TimeWheel
                  options={entryWheel}
                  selectedKey={entryAt}
                  onSelect={setEntryAt}
                  accessibilityLabel="Hora de ingreso"
                />
              </MomentField>
              <MomentField
                label="Egreso"
                dateText={exitDayKey ? dayLabel(exitDayKey) : '—'}
                timeText={exitAt ? timeOfIso(exitAt) : '—'}
                expanded={expanded === 'exit'}
                disabled={exits.length === 0}
                onToggle={() => {
                  setExpanded((current) =>
                    current === 'exit' ? null : 'exit',
                  );
                }}
              >
                <CalendarMonth
                  monthKey={shownExitMonth}
                  enabledKeys={exitDateKeys}
                  selectedKey={exitDayKey}
                  onSelect={selectExitDay}
                  onPrev={monthStep(
                    exitMonths,
                    shownExitMonth,
                    -1,
                    setExitMonth,
                  )}
                  onNext={monthStep(
                    exitMonths,
                    shownExitMonth,
                    1,
                    setExitMonth,
                  )}
                />
                <TimeWheel
                  options={exitWheel}
                  selectedKey={exitAt}
                  onSelect={setExitAt}
                  accessibilityLabel="Hora de egreso"
                />
              </MomentField>
            </View>

            <View style={styles.vehicles}>
              <Text style={styles.vehiclesTitle}>Vas a reservar con</Text>
              {vehicles.length === 0 ? (
                <View style={styles.emptyVehicles}>
                  <Text style={styles.emptyText}>
                    Agregá un vehículo para poder reservar.
                  </Text>
                </View>
              ) : (
                vehicles.map((vehicle) => {
                  const selected = vehicle.id === selectedId;
                  return (
                    <Pressable
                      key={vehicle.id}
                      style={({ pressed }) => [
                        styles.vehicle,
                        selected && styles.vehicleSelected,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        setSelectedId(vehicle.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${formatPlate(vehicle.plate)}, ${describeVehicle(vehicle)}`}
                    >
                      <DriverIcon
                        name={vehicleIconName(vehicle.kind)}
                        size={20}
                        color={driverColors.brand}
                      />
                      <View style={styles.vehicleCopy}>
                        <Text style={styles.plate}>
                          {formatPlate(vehicle.plate)}
                          {vehicle.isPrimary ? (
                            <Text style={styles.primaryTag}> · Principal</Text>
                          ) : null}
                        </Text>
                        <Text style={styles.vehicleMeta} numberOfLines={1}>
                          {describeVehicle(vehicle)}
                        </Text>
                      </View>
                      <View
                        style={[styles.radio, selected && styles.radioOn]}
                      />
                    </Pressable>
                  );
                })
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.manageButton,
                  pressed && styles.pressed,
                ]}
                onPress={onManageVehicles}
                accessibilityRole="button"
              >
                <Text style={styles.manageText}>
                  {vehicles.length === 0
                    ? 'Agregar vehículo en Perfil'
                    : 'Gestionar vehículos'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.quoteBox}>
              {quotePending ? (
                <ActivityIndicator color={driverColors.brand} />
              ) : quote ? (
                <>
                  <Text style={styles.quoteLabel}>Total estimado</Text>
                  <Text style={styles.quoteTotal}>
                    ${quote.totalArs.toLocaleString('es-AR')}
                  </Text>
                  <Text style={styles.quoteDetail}>
                    Tarifa de reservas · $
                    {quote.rate.hourPriceArs.toLocaleString('es-AR')} por hora
                  </Text>
                </>
              ) : (
                <Text style={styles.quoteError}>
                  {quoteError ??
                    (parking.schedules.length === 0
                      ? 'Este estacionamiento todavía no informó sus horarios.'
                      : 'Elegí ingreso y egreso para cotizar.')}
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                !canConfirm && styles.primaryButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                if (!selectedVehicle || !quote || confirming) return;
                setConfirming(true);
                void onConfirm({
                  reservationId,
                  parking,
                  vehicle: selectedVehicle,
                  quote,
                }).finally(() => {
                  setConfirming(false);
                });
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canConfirm, busy: confirming }}
              disabled={!canConfirm}
            >
              <Text style={styles.primaryText} numberOfLines={1}>
                {confirming
                  ? 'Reservando…'
                  : selectedVehicle && quote
                    ? `Reservar con ${formatPlate(selectedVehicle.plate)}`
                    : 'Reservar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Flecha de mes del calendario: sólo si hay otro mes con días elegibles. */
function monthStep(
  months: string[],
  current: string,
  step: 1 | -1,
  setMonth: (month: string) => void,
): (() => void) | undefined {
  const target = months[months.indexOf(current) + step];
  return target ? () => setMonth(target) : undefined;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: driverSpacing.lg,
    backgroundColor: driverColors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    overflow: 'hidden',
  },
  scroll: { width: '100%' },
  scrollContent: {
    padding: driverSpacing.lg,
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: driverSpacing.md,
    color: driverColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  parking: {
    marginTop: driverSpacing.sm,
    color: driverColors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  detail: {
    marginTop: 4,
    color: driverColors.textSecondary,
    fontSize: 14,
  },
  moments: {
    width: '100%',
    marginTop: driverSpacing.md,
    gap: driverSpacing.xs,
  },
  vehicles: {
    width: '100%',
    marginTop: driverSpacing.md,
    gap: driverSpacing.xs,
  },
  vehiclesTitle: {
    color: driverColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyVehicles: {
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.warningSurface,
  },
  emptyText: {
    color: driverColors.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  quoteBox: {
    width: '100%',
    minHeight: 72,
    marginTop: driverSpacing.md,
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteLabel: { color: driverColors.textMuted, fontSize: 12 },
  quoteTotal: {
    color: driverColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  quoteDetail: { color: driverColors.textSecondary, fontSize: 12 },
  quoteError: {
    color: driverColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  vehicle: {
    minHeight: 56,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  vehicleSelected: {
    borderColor: driverColors.brand,
    borderWidth: 2,
    backgroundColor: driverColors.brandSoft,
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  plate: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryTag: {
    color: driverColors.brand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  vehicleMeta: {
    marginTop: 2,
    color: driverColors.textMuted,
    fontSize: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: driverColors.border,
  },
  radioOn: {
    borderColor: driverColors.brand,
    borderWidth: 6,
  },
  manageButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  manageText: {
    color: driverColors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    paddingHorizontal: driverSpacing.lg,
    paddingTop: driverSpacing.sm,
    paddingBottom: driverSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: driverColors.border,
    flexDirection: 'row',
    gap: driverSpacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 2,
    minHeight: 48,
    paddingHorizontal: driverSpacing.xs,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: driverColors.disabled,
  },
  secondaryText: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryText: {
    color: driverColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
