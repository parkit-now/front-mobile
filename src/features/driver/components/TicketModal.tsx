import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Booking } from '../mock';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

type Props = {
  booking: Booking | null;
  onClose: () => void;
};

export function TicketModal({ booking, onClose }: Props) {
  return (
    <Modal
      visible={booking !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.icon}>
            <DriverIcon name="ticket" size={28} color={driverColors.brand} />
          </View>
          <Text style={styles.title}>Ticket de reserva</Text>
          {booking ? (
            <>
              <Text style={styles.code}>{booking.ticketCode}</Text>
              <Text style={styles.parking}>{booking.parkingName}</Text>
              <Text style={styles.detail}>
                {booking.dateLabel}, {booking.timeLabel}
              </Text>
            </>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
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
    padding: driverSpacing.lg,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    alignItems: 'center',
  },
  icon: {
    width: 56,
    height: 56,
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
  code: {
    marginTop: driverSpacing.md,
    color: driverColors.brand,
    fontSize: 24,
    fontWeight: '700',
  },
  parking: {
    marginTop: driverSpacing.sm,
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  detail: {
    marginTop: 4,
    color: driverColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginTop: driverSpacing.lg,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: driverColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
