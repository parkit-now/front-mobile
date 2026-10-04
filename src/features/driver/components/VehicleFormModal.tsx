import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import {
  formatPlate,
  isReservableCategory,
  validateVehicle,
  type DriverVehicle,
  type ReservableCategory,
  type ReservableCategoryOption,
  type VehicleDraft,
  type VehicleFieldErrors,
} from '../vehicles';
import { vehicleIconName } from './DriverIcon';
import { FloatingLayerHost, type FloatingLayerHandle } from './FloatingLayer';
import { FloatingSelect } from './FloatingSelect';

type Props = {
  // null = alta de un vehículo nuevo.
  vehicle: DriverVehicle | null;
  vehicles: DriverVehicle[];
  // Categorías reservables entre las que se elige.
  categories: ReservableCategoryOption[];
  // Con una reserva activa no se cambian patente ni tipo ni se elimina.
  lockedByReservation: boolean;
  onCancel: () => void;
  /** Guarda en el backend. Si rechaza, el formulario queda abierto. */
  onSave: (draft: VehicleDraft, makePrimary: boolean) => Promise<void>;
  onDelete: (vehicle: DriverVehicle) => Promise<void>;
};

export function VehicleFormModal({
  vehicle,
  vehicles,
  categories,
  lockedByReservation,
  onCancel,
  onSave,
  onDelete,
}: Props) {
  const isNew = vehicle === null;
  // El primer vehículo es principal sí o sí, y el principal actual no se puede
  // desmarcar: se cambia marcando otro.
  const primaryLocked = isNew ? vehicles.length === 0 : vehicle.isPrimary;
  const [plate, setPlate] = useState(vehicle ? formatPlate(vehicle.plate) : '');
  const [category, setCategory] = useState<ReservableCategory | null>(
    vehicle && isReservableCategory(vehicle.category) ? vehicle.category : null,
  );
  const [brand, setBrand] = useState(vehicle?.brand ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [makePrimary, setMakePrimary] = useState(primaryLocked);
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const floating = useRef<FloatingLayerHandle>(null);

  const selectedOption =
    categories.find(
      (option) => option.code === (category ?? categories[0]?.code),
    ) ?? null;
  const selectedCode = selectedOption?.code ?? category;

  function handleSave() {
    if (!selectedCode) {
      setErrors({ category: 'Elegí el tipo de vehículo.' });
      return;
    }
    const draft: VehicleDraft = {
      plate,
      category: selectedCode,
      brand: brand.trim(),
      model: model.trim(),
    };
    const nextErrors = validateVehicle(draft, vehicles, vehicle?.id ?? null);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    void onSave(draft, makePrimary).finally(() => {
      setSaving(false);
    });
  }

  function confirmDelete(target: DriverVehicle) {
    Alert.alert(
      'Eliminar vehículo',
      `¿Querés eliminar el vehículo ${formatPlate(target.plate)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setSaving(true);
            void onDelete(target).finally(() => {
              setSaving(false);
            });
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        // El atrás de Android primero cierra el desplegable abierto.
        if (floating.current?.dismiss()) return;
        onCancel();
      }}
    >
      <FloatingLayerHost ref={floating}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.dialog} accessibilityViewIsModal>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>
                {isNew ? 'Agregar vehículo' : 'Editar vehículo'}
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Patente</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.plate && styles.inputError,
                    lockedByReservation && styles.inputLocked,
                  ]}
                  editable={!lockedByReservation}
                  value={plate}
                  onChangeText={(value) => {
                    setPlate(value.toUpperCase());
                    if (errors.plate) setErrors({});
                  }}
                  placeholder="AB 123 CD"
                  placeholderTextColor={driverColors.disabled}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  accessibilityLabel="Patente"
                />
                {errors.plate ? (
                  <Text style={styles.errorText}>{errors.plate}</Text>
                ) : isNew ? (
                  <Text style={styles.fieldHint}>
                    Es la patente que lee la cámara al entrar. Revisá que esté
                    bien.
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Tipo</Text>
                <FloatingSelect
                  label="Tipo"
                  value={selectedOption?.code ?? null}
                  options={categories.map((option) => ({
                    value: option.code,
                    label: option.label,
                    icon: vehicleIconName(option.code),
                  }))}
                  onChange={(code) => {
                    setCategory(code);
                    if (errors.category) setErrors({});
                  }}
                  placeholder="Elegí un tipo"
                  disabled={lockedByReservation}
                  invalid={Boolean(errors.category)}
                  testID="vehicle-kind"
                />
                {errors.category ? (
                  <Text style={styles.errorText}>{errors.category}</Text>
                ) : null}
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.rowField]}>
                  <Text style={styles.label}>Marca (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="Toyota"
                    placeholderTextColor={driverColors.disabled}
                    accessibilityLabel="Marca"
                  />
                </View>
                <View style={[styles.field, styles.rowField]}>
                  <Text style={styles.label}>Modelo (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={model}
                    onChangeText={setModel}
                    placeholder="Etios"
                    placeholderTextColor={driverColors.disabled}
                    accessibilityLabel="Modelo"
                  />
                </View>
              </View>

              <View style={styles.primaryRow}>
                <View style={styles.primaryCopy}>
                  <Text style={styles.primaryTitle}>Vehículo principal</Text>
                  <Text style={styles.primaryHint}>
                    {primaryLocked && !isNew
                      ? 'Para cambiarlo, marcá otro vehículo como principal.'
                      : 'Se elige por defecto al reservar.'}
                  </Text>
                </View>
                <Switch
                  value={makePrimary}
                  onValueChange={setMakePrimary}
                  disabled={primaryLocked}
                  trackColor={{ true: driverColors.brand }}
                  accessibilityLabel="Vehículo principal"
                />
              </View>

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
                    saving && styles.buttonDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: saving, busy: saving }}
                >
                  <Text style={styles.primaryText}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </Pressable>
              </View>

              {lockedByReservation ? (
                <View style={styles.lockNotice}>
                  <Text style={styles.lockNoticeText}>
                    Este vehículo tiene una reserva activa: hasta que termine no
                    podés cambiar la patente ni el tipo, ni eliminarlo.
                  </Text>
                </View>
              ) : vehicle ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    confirmDelete(vehicle);
                  }}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: saving }}
                >
                  <Text style={styles.deleteText}>Eliminar vehículo</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </FloatingLayerHost>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.6 },
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
    maxHeight: '100%',
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
  },
  content: {
    padding: driverSpacing.lg,
    gap: driverSpacing.md,
  },
  title: {
    color: driverColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  label: {
    color: driverColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    color: driverColors.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: driverColors.danger,
    backgroundColor: driverColors.dangerSurface,
  },
  inputLocked: {
    backgroundColor: driverColors.background,
    color: driverColors.textSecondary,
  },
  fieldHint: {
    color: driverColors.textMuted,
    fontSize: 12,
  },
  lockNotice: {
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.warningSurface,
  },
  lockNoticeText: {
    color: driverColors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: driverColors.danger,
    fontSize: 13,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  row: {
    flexDirection: 'row',
    gap: driverSpacing.sm,
  },
  rowField: {
    flex: 1,
    minWidth: 0,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  primaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  primaryTitle: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryHint: {
    marginTop: 2,
    color: driverColors.textMuted,
    fontSize: 12,
  },
  actions: {
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
  deleteButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: driverColors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
