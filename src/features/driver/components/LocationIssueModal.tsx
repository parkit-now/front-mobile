import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LocationIssue } from '../services/location';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

type Props = {
  issue: LocationIssue | null;
  pending: boolean;
  onClose: () => void;
  onRetry: () => void;
};

const COPY_BY_KIND: Record<
  LocationIssue['kind'],
  { title: string; copy: string }
> = {
  'permission-denied': {
    title: 'Ubicación desactivada',
    copy: 'Activá el permiso para encontrar cocheras cerca tuyo. También podés buscar una dirección manualmente.',
  },
  'services-disabled': {
    title: 'GPS desactivado',
    copy: 'Activá la ubicación del dispositivo y volvé a intentarlo, o buscá una dirección manualmente.',
  },
  unavailable: {
    title: 'No encontramos tu ubicación',
    copy: 'Puede ser un problema temporal de señal. Volvé a intentarlo o buscá una dirección manualmente.',
  },
};

export function LocationIssueModal({
  issue,
  pending,
  onClose,
  onRetry,
}: Props) {
  const copy = issue ? COPY_BY_KIND[issue.kind] : null;
  const shouldOpenSettings =
    issue?.kind === 'services-disabled' || issue?.canAskAgain === false;

  return (
    <Modal
      visible={issue !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={styles.icon}>
            <DriverIcon
              name="current-location"
              size={28}
              color={driverColors.brand}
            />
          </View>
          <Text style={styles.title}>{copy?.title}</Text>
          <Text style={styles.copy}>{copy?.copy}</Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Buscar dirección</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pending && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                if (shouldOpenSettings) {
                  void Linking.openSettings();
                  return;
                }
                onRetry();
              }}
              disabled={pending}
              accessibilityRole="button"
              accessibilityState={{ disabled: pending, busy: pending }}
            >
              <Text style={styles.primaryText}>
                {pending
                  ? 'Buscando…'
                  : shouldOpenSettings
                    ? 'Abrir ajustes'
                    : 'Intentar de nuevo'}
              </Text>
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
    textAlign: 'center',
  },
  copy: {
    marginTop: driverSpacing.xs,
    color: driverColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: driverSpacing.lg,
    gap: driverSpacing.sm,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
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
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.75,
  },
});
