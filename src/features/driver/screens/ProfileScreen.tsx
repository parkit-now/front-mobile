import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { signOut } from '../../../lib/supabase/session';
import { getErrorMessage } from '../../auth/errors';
import { DriverIcon } from '../components/DriverIcon';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = {
  session: Session;
};

export function ProfileScreen({ session }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [pendingSignOut, setPendingSignOut] = useState(false);

  async function handleSignOut() {
    setPendingSignOut(true);
    try {
      await signOut();
    } catch (error) {
      showToast({ message: getErrorMessage(error), kind: 'error' });
    } finally {
      setPendingSignOut(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + driverSpacing.lg },
      ]}
    >
      <View>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.copy}>
          Gestioná tu cuenta y vehículo principal.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Cuenta</Text>
        <Text style={styles.value} selectable>
          {session.user.email ?? session.user.id}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Vehículo principal</Text>
        <View style={styles.vehicleRow}>
          <DriverIcon name="car" size={26} color={driverColors.brand} />
          <View>
            <Text style={styles.value}>Auto</Text>
            <Text style={styles.hint}>Patente ABC 123</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          pendingSignOut && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          void handleSignOut();
        }}
        disabled={pendingSignOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: pendingSignOut, busy: pendingSignOut }}
      >
        <Text style={styles.signOutText}>
          {pendingSignOut ? 'Cerrando...' : 'Cerrar sesión'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingBottom: driverSpacing.lg,
    gap: driverSpacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: driverColors.text,
    lineHeight: 34,
  },
  copy: {
    marginTop: 4,
    fontSize: 14,
    color: driverColors.textSecondary,
    lineHeight: 20,
  },
  card: {
    gap: driverSpacing.xs,
    padding: driverSpacing.md,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.textSecondary,
  },
  value: {
    fontSize: 15,
    color: driverColors.text,
    lineHeight: 22,
    fontWeight: '700',
  },
  hint: {
    marginTop: 2,
    fontSize: 13,
    color: driverColors.textMuted,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  signOutButton: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
});
