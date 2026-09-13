import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParkingLot } from '../mock';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

type Props = {
  parking: ParkingLot | null;
  onCancel: () => void;
  onConfirm: (parking: ParkingLot) => void;
};

export function ReservationModal({ parking, onCancel, onConfirm }: Props) {
  return (
    <Modal
      visible={parking !== null}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.icon}>
            <DriverIcon name="calendar" size={28} color={driverColors.brand} />
          </View>
          <Text style={styles.title}>Confirmar reserva</Text>
          {parking ? (
            <>
              <Text style={styles.parking}>{parking.name}</Text>
              <Text style={styles.detail}>Hoy, 18:30 a 20:30</Text>
              <Text style={styles.detail}>{parking.priceLabel}</Text>
            </>
          ) : null}
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
                pressed && styles.pressed,
              ]}
              onPress={() => {
                if (parking) onConfirm(parking);
              }}
              accessibilityRole="button"
              disabled={!parking}
            >
              <Text style={styles.primaryText}>Reservar</Text>
            </Pressable>
          </View>
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
  actions: {
    width: '100%',
    marginTop: driverSpacing.lg,
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
    flex: 1,
    minHeight: 48,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
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
