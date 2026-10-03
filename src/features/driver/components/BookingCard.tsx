import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Booking } from '../mock';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { formatPlate } from '../vehicles';
import { DriverIcon } from './DriverIcon';

const STATUS_LABELS: Record<Booking['status'], string> = {
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

type Props = {
  booking: Booking;
  onDirections: (booking: Booking) => void;
};

export function BookingCard({ booking, onDirections }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.ticketIcon}>
          <DriverIcon name="ticket" size={22} color={driverColors.brand} />
        </View>
        <View style={styles.heading}>
          <Text style={styles.name}>{booking.parkingName}</Text>
          <Text style={styles.address}>{booking.address}</Text>
          <Text style={styles.ticketCode}>
            Reserva {booking.ticketCode} · {formatPlate(booking.vehiclePlate)}
          </Text>
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
        <Detail
          label="Ingreso"
          value={booking.entry.timeLabel}
          caption={booking.entry.dateLabel}
        />
        <Detail
          label="Egreso"
          value={booking.exit.timeLabel}
          caption={booking.exit.dateLabel}
        />
        <Detail label="Total" value={booking.priceLabel} />
      </View>

      {booking.status === 'active' ? (
        <Pressable
          style={({ pressed }) => [
            styles.directionsButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            onDirections(booking);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Cómo llegar a ${booking.parkingName} con Google Maps`}
        >
          <DriverIcon
            name="directions"
            size={18}
            color={driverColors.surface}
          />
          <Text style={styles.directionsButtonText}>Cómo llegar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Detail({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <View
      style={styles.detail}
      accessible
      accessibilityLabel={[label, caption, value].filter(Boolean).join(', ')}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      {caption ? (
        <Text style={styles.detailCaption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
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
    alignItems: 'flex-start',
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
  detailCaption: {
    marginTop: 4,
    fontSize: 13,
    color: driverColors.text,
  },
  detailValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.text,
  },
  ticketCode: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: driverColors.textSecondary,
  },
  directionsButton: {
    minHeight: 44,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  directionsButtonText: {
    color: driverColors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
