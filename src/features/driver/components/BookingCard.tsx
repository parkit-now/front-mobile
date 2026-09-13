import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Booking } from '../mock';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

const STATUS_LABELS: Record<Booking['status'], string> = {
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

type Props = {
  booking: Booking;
  onViewTicket: (booking: Booking) => void;
};

export function BookingCard({ booking, onViewTicket }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.ticketIcon}>
          <DriverIcon name="ticket" size={22} color={driverColors.brand} />
        </View>
        <View style={styles.heading}>
          <Text style={styles.name}>{booking.parkingName}</Text>
          <Text style={styles.address}>{booking.address}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            booking.status === 'cancelled' && styles.statusPillMuted,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              booking.status === 'cancelled' && styles.statusTextMuted,
            ]}
          >
            {STATUS_LABELS[booking.status]}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <Detail label="Fecha" value={booking.dateLabel} />
        <Detail label="Horario" value={booking.timeLabel} />
        <Detail label="Total" value={booking.priceLabel} />
      </View>

      <View style={styles.actions}>
        <Text style={styles.ticketCode}>{booking.ticketCode}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.ticketButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            onViewTicket(booking);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Ver ticket ${booking.ticketCode}`}
        >
          <Text style={styles.ticketButtonText}>Ver ticket</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: driverSpacing.md,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    gap: driverSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  ticketIcon: {
    width: 42,
    height: 42,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.text,
  },
  address: {
    marginTop: 2,
    fontSize: 13,
    color: driverColors.textMuted,
  },
  statusPill: {
    paddingHorizontal: driverSpacing.xs,
    paddingVertical: 5,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.successSurface,
  },
  statusPillMuted: {
    backgroundColor: driverColors.brandSoft,
  },
  statusText: {
    color: driverColors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextMuted: {
    color: driverColors.textMuted,
  },
  details: {
    minHeight: 66,
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    flexDirection: 'row',
    gap: driverSpacing.xs,
  },
  detail: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: driverColors.textMuted,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: driverSpacing.sm,
  },
  ticketCode: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.text,
  },
  ticketButton: {
    minHeight: 44,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketButtonText: {
    color: driverColors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
