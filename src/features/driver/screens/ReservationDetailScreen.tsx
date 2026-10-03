import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translateApiError } from '../../../lib/api/translate';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { CancelSheet } from '../components/CancelSheet';
import { DriverIcon } from '../components/DriverIcon';
import { StatusPill, toneColors } from '../components/StatusPill';
import { useDriverData } from '../hooks/useDriverData';
import type { Booking } from '../mock';
import type { DriverRootParamList } from '../navigation';
import { pollReservation } from '../pollReservation';
import { buildReturnUrl } from '../reservationLinks';
import {
  clockLabel,
  formatArs,
  formatCountdown,
  holdRemainingSeconds,
  phaseBadge,
  policyText,
  reasonText,
  refundChip,
  reservationPhase,
  type ReservationPhase,
} from '../reservationStatus';
import { openDirections } from '../services/directions';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';
import { formatPlate } from '../vehicles';

type Props = NativeStackScreenProps<DriverRootParamList, 'ReservationDetail'>;

/** Reloj de pantalla: se actualiza cada segundo mientras `active`. */
function useNow(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [active]);
  return now;
}

export function ReservationDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { bookings, reloadBooking, retryPayment } = useDriverData();
  const { reservationId, returnedAt } = route.params;
  const booking = bookings.find((item) => item.id === reservationId) ?? null;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const polling = useRef<AbortController | null>(null);

  const phase = booking ? reservationPhase(booking) : null;
  const ticking = phase === 'awaiting_payment' || phase === 'payment_rejected';
  const now = useNow(ticking);
  const livePhase = booking ? reservationPhase(booking, now) : null;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      await reloadBooking(reservationId);
    } catch (error) {
      setLoadError(
        translateApiError(error, { endpoint: 'driver.reservations' }),
      );
    }
  }, [reloadBooking, reservationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Cuando la retención vence en pantalla, el backend ya la marcó `expired`.
  useEffect(() => {
    if (booking?.lifecycle === 'pending_payment' && livePhase === 'expired') {
      void load();
    }
  }, [booking?.lifecycle, livePhase, load]);

  // Al volver del checkout, el estado lo define el backend (no el `status` del
  // deep link): se pregunta cada 2 s, hasta 30 s, a que deje de estar "esperando pago".
  const confirmPayment = useCallback(() => {
    if (polling.current) return;
    const controller = new AbortController();
    polling.current = controller;
    setConfirming(true);
    setTimedOut(false);
    void pollReservation({
      fetchOnce: () => reloadBooking(reservationId),
      isSettled: (current) => reservationPhase(current) !== 'awaiting_payment',
      signal: controller.signal,
    }).then((result) => {
      if (polling.current !== controller) return;
      polling.current = null;
      setConfirming(false);
      setTimedOut(result.outcome === 'timeout');
    });
  }, [reloadBooking, reservationId]);

  useEffect(() => {
    if (returnedAt !== undefined) confirmPayment();
  }, [returnedAt, confirmPayment]);

  useEffect(
    () => () => {
      polling.current?.abort();
      polling.current = null;
    },
    [],
  );

  async function pay(current: Booking) {
    if (paying) return;
    setPaying(true);
    try {
      let checkoutUrl = current.checkoutUrl;
      // Rechazado (o sin URL viva): se pide un checkout nuevo.
      if (!checkoutUrl || reservationPhase(current) === 'payment_rejected') {
        checkoutUrl = (await retryPayment(current.id)).checkoutUrl;
      }
      if (!checkoutUrl) {
        await load();
        return;
      }
      const returnUrl = buildReturnUrl(current.id, Linking.createURL);
      // Custom Tab (Android) / popup (web): vuelve solo por el returnUrl.
      await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
      confirmPayment();
    } catch (error) {
      showToast({
        message: translateApiError(error, {
          endpoint: 'driver.reservationPayment',
        }),
        kind: 'error',
      });
      await load();
    } finally {
      setPaying(false);
    }
  }

  function goBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Tabs', { screen: 'Reservations' });
    }
  }

  function searchAnother() {
    navigation.navigate('Tabs', { screen: 'Explore' });
  }

  async function directions(current: Booking) {
    const opened = await openDirections(current.coordinate);
    if (!opened) {
      showToast({
        message: 'No pudimos abrir la aplicación de mapas.',
        kind: 'error',
      });
    }
  }

  const title =
    livePhase === 'awaiting_payment'
      ? 'Confirmá y pagá'
      : livePhase === 'payment_rejected'
        ? 'Pago rechazado'
        : 'Tu reserva';

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + driverSpacing.sm,
            paddingBottom: Math.max(insets.bottom, driverSpacing.lg),
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <DriverIcon name="back" size={22} color={driverColors.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>

        {confirming ? (
          <View style={styles.center} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={driverColors.brand} />
            <Text style={styles.heading}>Confirmando tu pago…</Text>
            <Text style={styles.muted}>
              Mercado Pago ya nos avisó. Esto tarda unos segundos.
            </Text>
          </View>
        ) : !booking || !livePhase ? (
          loadError ? (
            <View style={styles.center}>
              <Text style={styles.heading}>No pudimos cargar la reserva</Text>
              <Text style={styles.muted}>{loadError}</Text>
              <Pressable
                onPress={() => {
                  void load();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={driverColors.brand} />
              <Text style={styles.muted}>Cargando tu reserva…</Text>
            </View>
          )
        ) : (
          <PhaseBody
            booking={booking}
            phase={livePhase}
            now={now}
            timedOut={timedOut}
            paying={paying}
            onPay={() => {
              void pay(booking);
            }}
            onRefresh={() => {
              setTimedOut(false);
              confirmPayment();
            }}
            onCancel={() => {
              setCancelOpen(true);
            }}
            onDirections={() => {
              void directions(booking);
            }}
            onSearch={searchAnother}
            onMyReservations={() => {
              navigation.navigate('Tabs', { screen: 'Reservations' });
            }}
          />
        )}
      </ScrollView>

      {cancelOpen && booking ? (
        <CancelSheet
          booking={booking}
          onClose={() => {
            setCancelOpen(false);
          }}
          onCancelled={() => {
            setCancelOpen(false);
            showToast({ message: 'Reserva cancelada.', kind: 'success' });
          }}
        />
      ) : null}
    </View>
  );
}

type BodyProps = {
  booking: Booking;
  phase: ReservationPhase;
  now: Date;
  timedOut: boolean;
  paying: boolean;
  onPay: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  onDirections: () => void;
  onSearch: () => void;
  onMyReservations: () => void;
};

function PhaseBody({
  booking,
  phase,
  now,
  timedOut,
  paying,
  onPay,
  onRefresh,
  onCancel,
  onDirections,
  onSearch,
  onMyReservations,
}: BodyProps) {
  const badge = phaseBadge(phase);
  const policy = policyText(booking.entryAt, booking.policy);
  const refund = refundChip(booking, phase);
  const reason = reasonText(booking);
  const remaining = holdRemainingSeconds(booking.holdExpiresAt, now);

  switch (phase) {
    case 'awaiting_payment':
    case 'payment_rejected': {
      const rejected = phase === 'payment_rejected';
      return (
        <>
          {rejected ? (
            <Banner
              tone="err"
              icon="!"
              title="El pago no se aprobó"
              copy="No te cobramos nada. Podés intentar con otro medio de pago."
            />
          ) : null}
          {timedOut && !rejected ? (
            <Banner
              tone="warn"
              icon="⧗"
              title="Todavía no recibimos la confirmación"
              copy="Si ya pagaste, puede tardar un poco más. Tocá Actualizar en unos segundos."
            />
          ) : null}
          <View style={styles.countdown} accessibilityLiveRegion="polite">
            <Text style={styles.countdownText}>
              {rejected ? 'Tu lugar sigue guardado' : 'Te guardamos el lugar'}{' '}
              <Text style={styles.countdownValue}>
                {formatCountdown(remaining)}
              </Text>
            </Text>
          </View>
          <SummaryCard
            booking={booking}
            badge={<StatusPill {...badge} />}
            totalLabel="Total"
          />
          <View style={styles.card}>
            <Row
              label="Medio de pago"
              value="Mercado Pago"
              valueColor="#009ee3"
            />
            <Text style={styles.small}>
              Dinero en cuenta, débito o crédito. Vas a elegir en la pantalla de
              Mercado Pago.
            </Text>
          </View>
          <Text style={styles.small}>{policy}</Text>
          <Text style={styles.small}>
            Si no pagás a tiempo, liberamos el lugar.
          </Text>
          <PrimaryButton
            label={
              paying
                ? 'Abriendo Mercado Pago…'
                : rejected
                  ? 'Reintentar con Mercado Pago'
                  : 'Pagar con Mercado Pago'
            }
            onPress={onPay}
            disabled={paying}
            mp
          />
          {timedOut && !rejected ? (
            <SecondaryButton label="Actualizar" onPress={onRefresh} />
          ) : null}
          {booking.cancellable ? (
            <GhostButton label="Cancelar reserva" onPress={onCancel} />
          ) : null}
        </>
      );
    }
    case 'awaiting_approval':
      return (
        <>
          <Banner
            tone="warn"
            icon="⧗"
            title="Pago aprobado"
            copy={`${booking.parkingName} tiene que aceptar tu reserva.${
              booking.approvalDeadlineAt
                ? ` Responde antes de las ${clockLabel(new Date(booking.approvalDeadlineAt))}.`
                : ''
            } Si no la acepta, te devolvemos todo.`}
          />
          <SummaryCard
            booking={booking}
            badge={<StatusPill {...badge} />}
            totalLabel="Pagado"
          />
          <Text style={styles.small}>{policy}</Text>
          {booking.cancellable ? (
            <GhostButton
              label="Cancelar (reembolso total)"
              onPress={onCancel}
            />
          ) : null}
        </>
      );
    case 'confirmed':
    case 'in_progress':
      return (
        <>
          <View style={[styles.card, styles.centerCard]}>
            <View
              style={[
                styles.bigIcon,
                { backgroundColor: toneColors.ok.surface },
              ]}
            >
              <Text style={[styles.bigIconText, { color: toneColors.ok.text }]}>
                ✓
              </Text>
            </View>
            <Text style={styles.heading}>
              {phase === 'in_progress'
                ? 'Estás estacionado'
                : '¡Listo! Tenés tu lugar'}
            </Text>
            <Text style={styles.small}>Código de reserva</Text>
            <Text style={styles.code} selectable>
              {booking.ticketCode}
            </Text>
          </View>
          <SummaryCard
            booking={booking}
            badge={<StatusPill {...badge} />}
            totalLabel="Pagado"
          />
          <Text style={styles.small}>{policy}</Text>
          <SecondaryButton label="Cómo llegar" onPress={onDirections} />
          {booking.cancellable ? (
            <GhostButton label="Cancelar reserva" onPress={onCancel} />
          ) : null}
        </>
      );
    case 'rejected':
      return (
        <>
          <Banner
            tone="err"
            icon="↺"
            title="No pudimos confirmar tu reserva"
            copy={
              reason ?? `${booking.parkingName} no pudo aceptar tu reserva.`
            }
          />
          <RefundCard booking={booking} refundLabel={refund?.label} />
          <PrimaryButton
            label="Buscar otro estacionamiento"
            onPress={onSearch}
          />
        </>
      );
    case 'expired':
      return (
        <>
          <Banner
            tone="muted"
            icon="⌛"
            title="Se liberó el lugar"
            copy={
              booking.paymentStatus === 'approved'
                ? 'Se venció el tiempo de la reserva. Si se te cobró, te devolvemos todo.'
                : 'Se venció el tiempo para pagar. No te cobramos nada.'
            }
          />
          <SummaryCard
            booking={booking}
            badge={<StatusPill {...badge} />}
            totalLabel="Total"
          />
          <PrimaryButton
            label="Buscar otro estacionamiento"
            onPress={onSearch}
          />
        </>
      );
    default:
      return (
        <>
          {reason ? (
            <Banner
              tone={phase === 'cancelled_by_owner' ? 'err' : 'muted'}
              icon="i"
              title={
                phase === 'cancelled_by_owner'
                  ? `${booking.parkingName} canceló tu reserva`
                  : badge.label
              }
              copy={reason}
            />
          ) : null}
          <SummaryCard
            booking={booking}
            badge={<StatusPill {...badge} />}
            totalLabel="Total"
          />
          {refund ? (
            <View style={styles.card}>
              <Row
                label="Reembolso"
                value={refund.label}
                valueColor={toneColors[refund.tone].text}
              />
            </View>
          ) : null}
          <SecondaryButton
            label="Ver mis reservas"
            onPress={onMyReservations}
          />
          <PrimaryButton
            label="Buscar otro estacionamiento"
            onPress={onSearch}
          />
        </>
      );
  }
}

function SummaryCard({
  booking,
  badge,
  totalLabel,
}: {
  booking: Booking;
  badge: ReactNode;
  totalLabel: string;
}) {
  const sameDay = booking.entry.dateLabel === booking.exit.dateLabel;
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.parking} numberOfLines={2}>
          {booking.parkingName}
        </Text>
        {badge}
      </View>
      <Row
        label="Cuándo"
        value={
          sameDay
            ? `${booking.entry.dateLabel}, ${booking.entry.timeLabel} – ${booking.exit.timeLabel}`
            : `${booking.entry.dateLabel} ${booking.entry.timeLabel} – ${booking.exit.dateLabel} ${booking.exit.timeLabel}`
        }
      />
      <Row label="Vehículo" value={formatPlate(booking.vehiclePlate)} />
      <Row label={totalLabel} value={formatArs(booking.totalArs)} />
    </View>
  );
}

function RefundCard({
  booking,
  refundLabel,
}: {
  booking: Booking;
  refundLabel: string | undefined;
}) {
  return (
    <View style={styles.card}>
      <Row
        label="Te devolvemos"
        value={formatArs(booking.refundedAmountArs ?? booking.totalArs)}
        valueColor={toneColors.ok.text}
      />
      {refundLabel ? <Row label="Estado" value={refundLabel} /> : null}
      <Text style={styles.small}>
        Con tarjeta puede tardar hasta 10 días hábiles en verse en el resumen.
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </Text>
    </View>
  );
}

function Banner({
  tone,
  icon,
  title,
  copy,
}: {
  tone: 'ok' | 'warn' | 'err' | 'muted';
  icon: string;
  title: string;
  copy: string;
}) {
  const colors = toneColors[tone];
  return (
    <View style={[styles.card, styles.centerCard]} accessibilityRole="alert">
      <View style={[styles.bigIcon, { backgroundColor: colors.surface }]}>
        <Text style={[styles.bigIconText, { color: colors.text }]}>{icon}</Text>
      </View>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.centerCopy}>{copy}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  mp = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  mp?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primary,
        mp && styles.primaryMp,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled }}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: driverColors.surface },
  content: {
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    gap: driverSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
    minHeight: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: driverColors.text },
  center: {
    paddingVertical: driverSpacing.lg * 2,
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: driverColors.text,
    textAlign: 'center',
  },
  muted: {
    fontSize: 14,
    color: driverColors.textSecondary,
    textAlign: 'center',
  },
  link: { color: driverColors.brand, fontSize: 15, fontWeight: '700' },
  countdown: {
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.warningSurface,
    alignItems: 'center',
  },
  countdownText: {
    color: driverColors.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  countdownValue: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  card: {
    padding: driverSpacing.md,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    gap: driverSpacing.xs,
  },
  centerCard: { alignItems: 'center', gap: 6 },
  centerCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: driverColors.textSecondary,
    textAlign: 'center',
  },
  bigIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIconText: { fontSize: 22, fontWeight: '800' },
  code: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    color: driverColors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: driverSpacing.sm,
  },
  parking: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.text,
  },
  rowLabel: { fontSize: 13, color: driverColors.textMuted },
  rowValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.text,
    textAlign: 'right',
  },
  small: { fontSize: 13, lineHeight: 18, color: driverColors.textSecondary },
  primary: {
    minHeight: 52,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: driverSpacing.md,
  },
  primaryMp: { backgroundColor: '#009ee3' },
  primaryText: { color: driverColors.surface, fontSize: 16, fontWeight: '700' },
  disabled: { backgroundColor: driverColors.disabled },
  secondary: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: driverColors.brand, fontSize: 15, fontWeight: '700' },
  ghost: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: driverColors.danger, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
