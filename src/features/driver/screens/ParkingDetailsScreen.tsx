import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translateApiError } from '../../../lib/api/translate';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { availabilityLabel, availabilityLevel } from '../availability';
import { DriverIcon } from '../components/DriverIcon';
import { ReservationModal } from '../components/ReservationModal';
import { useDriverData } from '../hooks/useDriverData';
import { useParkingDetail } from '../hooks/useParkingDetail';
import type { ParkingLot } from '../mock';
import type { DiscoveryStackParamList } from '../navigation';
import { weeklySchedule } from '../schedules';
import { fetchParkingQuote } from '../services/driver';
import {
  availabilityColors,
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'ParkingDetails'>;

export function ParkingDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { accessToken, createReservation, vehicles } = useDriverData();
  const [reservationParking, setReservationParking] =
    useState<ParkingLot | null>(null);
  const routeParking = route.params.parking;
  const detail = useParkingDetail(routeParking.id, accessToken);
  const parking: ParkingLot = detail.parking
    ? {
        ...detail.parking,
        distance: routeParking.distance,
        eta: routeParking.eta,
      }
    : routeParking;
  const quoteReservation = useCallback(
    (input: { entryAt: string; exitAt: string }) =>
      fetchParkingQuote(
        parking.id,
        { entryAt: input.entryAt, exitAt: input.exitAt },
        accessToken,
      ),
    [accessToken, parking.id],
  );
  const availability =
    availabilityColors[
      availabilityLevel(parking.availableSpots, parking.totalSpots)
    ];

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
            onPress={navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Volver al mapa"
          >
            <DriverIcon name="back" size={22} color={driverColors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ESTACIONAMIENTO</Text>
            <Text style={styles.title}>{parking.name}</Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <DriverIcon name="pin" size={20} color={driverColors.brand} />
          <Text style={styles.address}>{parking.address}</Text>
        </View>

        <View style={styles.summary}>
          <SummaryValue label="Precio" value={parking.priceLabel} />
          <SummaryValue label="Distancia" value={parking.distance} />
          <SummaryValue
            label="Disponibles"
            value={
              parking.availableSpots === null
                ? '—'
                : String(parking.availableSpots)
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horarios</Text>
          <Text
            style={[
              styles.openStatus,
              detail.status === 'success' &&
                parking.openNow === true &&
                styles.openStatusOpen,
              detail.status === 'success' &&
                parking.openNow === false &&
                styles.openStatusClosed,
            ]}
          >
            {detail.status === 'loading'
              ? 'Consultando horarios…'
              : detail.status === 'error'
                ? 'No pudimos cargar los horarios.'
                : parking.openNow === null
                  ? 'Horario no informado'
                  : parking.openNow
                    ? 'Abierto ahora'
                    : 'Cerrado ahora'}
          </Text>
          {detail.status === 'error' ? (
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
              onPress={detail.retry}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          ) : null}
          {parking.schedules.length > 0 ? (
            <View style={styles.scheduleList}>
              {weeklySchedule(parking.schedules).map((row) => (
                <View key={row.day} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{row.label}</Text>
                  <Text
                    style={[
                      styles.scheduleHours,
                      row.closed && styles.scheduleHoursClosed,
                    ]}
                  >
                    {row.hours}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios</Text>
          <View style={styles.services}>
            {parking.services.map((service) => (
              <View key={service} style={styles.serviceChip}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[styles.notice, { backgroundColor: availability.surface }]}
        >
          <Text style={[styles.noticeTitle, { color: availability.text }]}>
            {availabilityLabel(parking.availableSpots)}
          </Text>
          <Text style={styles.noticeCopy}>
            La disponibilidad es informativa y no garantiza un lugar hasta
            confirmar una reserva.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.reserveButton,
            (!parking.acceptsReservations || detail.status !== 'success') &&
              styles.disabledButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setReservationParking(parking);
          }}
          disabled={!parking.acceptsReservations || detail.status !== 'success'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !parking.acceptsReservations }}
        >
          <Text style={styles.reserveText}>
            {parking.acceptsReservations
              ? 'Reservar ahora'
              : 'Sin reserva anticipada'}
          </Text>
        </Pressable>
      </ScrollView>

      {reservationParking ? (
        <ReservationModal
          parking={reservationParking}
          vehicles={vehicles}
          onQuote={quoteReservation}
          onCancel={() => {
            setReservationParking(null);
          }}
          onManageVehicles={() => {
            setReservationParking(null);
            navigation.getParent()?.navigate('Profile');
          }}
          onConfirm={async ({
            reservationId,
            parking: selected,
            vehicle,
            quote,
          }) => {
            try {
              await createReservation({
                id: reservationId,
                parking: selected,
                vehicle,
                entryAt: quote.entryAt,
                exitAt: quote.exitAt,
              });
              setReservationParking(null);
              showToast({
                message: 'Reserva confirmada. Podés verla en Mis reservas.',
                kind: 'success',
              });
            } catch (error) {
              showToast({
                message: translateApiError(error, {
                  endpoint: 'driver.reservations',
                }),
                kind: 'error',
              });
            }
          }}
        />
      ) : null}
    </View>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryValue}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: driverColors.surface,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverSpacing.lg,
    gap: driverSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: driverSpacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 5 },
  eyebrow: {
    color: driverColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: driverColors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  address: {
    flex: 1,
    color: driverColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  summary: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: driverColors.border,
    borderRadius: driverRadius.card,
    flexDirection: 'row',
  },
  summaryValue: {
    flex: 1,
    minWidth: 0,
    padding: driverSpacing.sm,
    justifyContent: 'center',
    gap: 4,
  },
  summaryLabel: { color: driverColors.textMuted, fontSize: 11 },
  summaryText: {
    color: driverColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  section: { gap: driverSpacing.sm },
  sectionTitle: {
    color: driverColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  openStatus: {
    color: driverColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  openStatusOpen: { color: driverColors.success },
  openStatusClosed: { color: driverColors.danger },
  scheduleList: { gap: 6 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scheduleDay: { color: driverColors.textSecondary, fontSize: 13 },
  scheduleHours: { color: driverColors.text, fontSize: 13, fontWeight: '600' },
  scheduleHoursClosed: { color: driverColors.textMuted, fontWeight: '400' },
  retryButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  retryText: { color: driverColors.brand, fontSize: 14, fontWeight: '700' },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: driverSpacing.xs,
  },
  serviceChip: {
    minHeight: 34,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    color: driverColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  notice: {
    padding: driverSpacing.md,
    borderRadius: driverRadius.control,
    gap: 5,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noticeCopy: {
    color: driverColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  reserveButton: {
    minHeight: 50,
    marginTop: 'auto',
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { backgroundColor: driverColors.disabled },
  reserveText: {
    color: driverColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.75 },
});
