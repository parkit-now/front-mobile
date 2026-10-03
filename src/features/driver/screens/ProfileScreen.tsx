import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translateApiError } from '../../../lib/api/translate';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { signOut } from '../../../lib/supabase/session';
import { getErrorMessage } from '../../auth/errors';
import { DriverIcon, vehicleIconName } from '../components/DriverIcon';
import { VehicleFormModal } from '../components/VehicleFormModal';
import { useDriverData } from '../hooks/useDriverData';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';
import {
  describeVehicle,
  formatPlate,
  hasActiveReservation,
  type DriverVehicle,
} from '../vehicles';

type Props = {
  session: Session;
};

// null = cerrado; 'new' = alta; un vehículo = edición.
type VehicleFormState = 'new' | DriverVehicle | null;

export function ProfileScreen({ session }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const {
    bookings,
    vehicles,
    vehiclesStatus,
    refreshVehicles,
    vehicleCategories,
    saveVehicle,
    removeVehicle,
  } = useDriverData();
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(null);
  const editingVehicle = vehicleForm === 'new' ? null : vehicleForm;

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
        <Text style={styles.copy}>Gestioná tu cuenta y tus vehículos.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Cuenta</Text>
        <Text style={styles.value} selectable>
          {session.user.email ?? session.user.id}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis vehículos</Text>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setVehicleForm('new');
            }}
            accessibilityRole="button"
            accessibilityLabel="Agregar vehículo"
          >
            <DriverIcon name="plus" size={16} color={driverColors.brand} />
            <Text style={styles.addText}>Agregar</Text>
          </Pressable>
        </View>

        {vehiclesStatus === 'loading' && vehicles.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.hint}>Cargando tus vehículos...</Text>
          </View>
        ) : vehiclesStatus === 'error' && vehicles.length === 0 ? (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => {
              void refreshVehicles();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.value}>No pudimos cargar tus vehículos</Text>
            <Text style={styles.hint}>Tocá para reintentar.</Text>
          </Pressable>
        ) : vehicles.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.value}>Todavía no agregaste vehículos</Text>
            <Text style={styles.hint}>
              Necesitás al menos uno para reservar una cochera.
            </Text>
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <Pressable
              key={vehicle.id}
              style={({ pressed }) => [
                styles.card,
                styles.vehicleRow,
                vehicle.isPrimary && styles.vehicleRowPrimary,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setVehicleForm(vehicle);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${formatPlate(vehicle.plate)}, ${describeVehicle(vehicle, vehicleCategories)}${vehicle.isPrimary ? ', vehículo principal' : ''}. Tocar para editar`}
            >
              <View style={styles.vehicleIcon}>
                <DriverIcon
                  name={vehicleIconName(vehicle.category)}
                  size={24}
                  color={driverColors.brand}
                />
              </View>
              <View style={styles.vehicleCopy}>
                <Text style={styles.plate}>{formatPlate(vehicle.plate)}</Text>
                <Text style={styles.hint} numberOfLines={1}>
                  {describeVehicle(vehicle, vehicleCategories)}
                </Text>
              </View>
              {vehicle.isPrimary ? (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Principal</Text>
                </View>
              ) : null}
            </Pressable>
          ))
        )}
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

      {vehicleForm !== null ? (
        <VehicleFormModal
          vehicle={editingVehicle}
          vehicles={vehicles}
          categories={vehicleCategories}
          lockedByReservation={
            editingVehicle !== null &&
            hasActiveReservation(editingVehicle, bookings)
          }
          onCancel={() => {
            setVehicleForm(null);
          }}
          onSave={async (draft, makePrimary) => {
            try {
              await saveVehicle({
                vehicle: editingVehicle,
                draft,
                makePrimary,
              });
              setVehicleForm(null);
              showToast({
                message: editingVehicle
                  ? 'Vehículo actualizado.'
                  : 'Vehículo agregado.',
                kind: 'success',
              });
            } catch (error) {
              showToast({
                message: translateApiError(error, {
                  endpoint: 'driver.vehicles',
                }),
                kind: 'error',
              });
            }
          }}
          onDelete={async (vehicle) => {
            try {
              await removeVehicle(vehicle.id);
              setVehicleForm(null);
              showToast({ message: 'Vehículo eliminado.', kind: 'success' });
            } catch (error) {
              showToast({
                message: translateApiError(error, {
                  endpoint: 'driver.vehicles',
                }),
                kind: 'error',
              });
            }
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
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
  section: {
    gap: driverSpacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    minHeight: 44,
    paddingHorizontal: driverSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    color: driverColors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  vehicleRowPrimary: {
    // Borde más grueso sin correr el contenido respecto de las otras filas.
    padding: driverSpacing.md - 1,
    borderColor: driverColors.brand,
    borderWidth: 2,
  },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  plate: {
    fontSize: 17,
    fontWeight: '700',
    color: driverColors.text,
    letterSpacing: 1,
  },
  primaryBadge: {
    paddingHorizontal: driverSpacing.xs,
    paddingVertical: 5,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brand,
  },
  primaryBadgeText: {
    color: driverColors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  signOutButton: {
    marginTop: 'auto',
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.danger,
    backgroundColor: driverColors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: driverColors.danger,
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
