import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { DriverIcon } from '../components/DriverIcon';
import { ReservationModal } from '../components/ReservationModal';
import { useDriverData } from '../hooks/useDriverData';
import type { ParkingLot } from '../mock';
import type { DiscoveryStackParamList } from '../navigation';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'ParkingDetails'>;

export function ParkingDetailsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { createReservation } = useDriverData();
  const [reservationParking, setReservationParking] =
    useState<ParkingLot | null>(null);
  const { parking } = route.params;

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
          <SummaryValue label="Distancia" value={parking.distanceLabel} />
          <SummaryValue
            label="Disponibles"
            value={String(parking.availableSpots)}
          />
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

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            {parking.availableSpots} lugares libres ahora
          </Text>
          <Text style={styles.noticeCopy}>
            La disponibilidad es informativa y no garantiza un lugar hasta
            confirmar una reserva.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.reserveButton,
            !parking.acceptsReservations && styles.disabledButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            setReservationParking(parking);
          }}
          disabled={!parking.acceptsReservations}
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

      <ReservationModal
        parking={reservationParking}
        onCancel={() => {
          setReservationParking(null);
        }}
        onConfirm={(selectedParking) => {
          createReservation(selectedParking);
          setReservationParking(null);
          showToast({
            message: 'Reserva confirmada. Podés verla en Mis reservas.',
            kind: 'success',
          });
        }}
      />
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
    backgroundColor: driverColors.successSurface,
    gap: 5,
  },
  noticeTitle: {
    color: driverColors.success,
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
