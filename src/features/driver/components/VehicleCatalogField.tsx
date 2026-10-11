import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import {
  catalogOptionLabel,
  searchCatalog,
  type CatalogItem,
  type CatalogOption,
} from '../vehicleCatalog';
import { vehicleIconName } from '../vehicles';
import { DriverIcon } from './DriverIcon';

// Cuántas opciones se muestran debajo del campo: entran en el diálogo sin
// taparlo, y con dos o tres letras más la lista ya se achica sola.
const MAX_OPTIONS = 6;

type Props = {
  /** Lo que está escrito en el campo. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Marca y modelo elegidos ("Toyota Etios"), o '' si no hay. */
  selectedLabel: string;
  /** Una opción del catálogo, o `null` para quitar marca y modelo. */
  onSelect: (option: CatalogOption | null) => void;
  /** Pide el catálogo; se llama al enfocar el campo y al reintentar. */
  loadCatalog: () => Promise<CatalogItem[]>;
  invalid?: boolean;
  onFocus?: () => void;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: CatalogItem[] };

/**
 * Marca y modelo sobre el catálogo de la plataforma (SCRUM-301). El conductor
 * escribe y las coincidencias aparecen debajo del campo, en el mismo
 * formulario. No hay texto libre: lo escrito sólo sirve para buscar, y vale lo
 * que se elige de la lista. Borrar el campo quita marca y modelo.
 *
 * Las opciones van en línea y no en un Popover: el Popover baja el teclado al
 * abrirse, y acá hace falta seguir escribiendo.
 */
export function VehicleCatalogField({
  query,
  onQueryChange,
  selectedLabel,
  onSelect,
  loadCatalog,
  invalid = false,
  onFocus,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  const load = useCallback(() => {
    setState({ status: 'loading' });
    loadCatalog()
      .then((items) => {
        setState({ status: 'ready', items });
      })
      .catch(() => {
        setState({ status: 'error' });
      });
  }, [loadCatalog]);

  const typed = query.trim();
  // Hay texto que todavía no corresponde a una opción elegida.
  const searching = typed.length > 0 && typed !== selectedLabel;
  const options =
    searching && state.status === 'ready'
      ? searchCatalog(state.items, typed, MAX_OPTIONS)
      : [];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.field, invalid && styles.fieldInvalid]}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(value) => {
            onQueryChange(value);
            if (value.trim().length === 0 && selectedLabel) onSelect(null);
          }}
          onFocus={() => {
            if (state.status === 'idle' || state.status === 'error') load();
            onFocus?.();
          }}
          placeholder="Buscá tu vehículo, por ejemplo Etios"
          placeholderTextColor={driverColors.disabled}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxLength={60}
          accessibilityLabel="Marca y modelo"
          accessibilityHint="Escribí para buscar y elegí una opción de la lista"
          testID="vehicle-catalog-field"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              onQueryChange('');
              if (selectedLabel) onSelect(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Quitar marca y modelo"
            hitSlop={8}
          >
            <DriverIcon name="close" size={18} color={driverColors.textMuted} />
          </Pressable>
        ) : (
          <DriverIcon name="search" size={20} color={driverColors.textMuted} />
        )}
      </View>

      {searching ? (
        <View style={styles.options} testID="vehicle-catalog-options">
          {state.status === 'loading' || state.status === 'idle' ? (
            <View style={styles.status}>
              <ActivityIndicator color={driverColors.brand} />
              <Text style={styles.statusText}>Cargando vehículos...</Text>
            </View>
          ) : state.status === 'error' ? (
            <Pressable
              style={({ pressed }) => [
                styles.status,
                pressed && styles.optionPressed,
              ]}
              onPress={load}
              accessibilityRole="button"
            >
              <Text style={styles.statusText}>
                No pudimos cargar la lista. Tocá para reintentar.
              </Text>
            </Pressable>
          ) : options.length === 0 ? (
            <Text style={styles.empty}>
              No encontramos ese vehículo. Probá con la marca sola, o borrá el
              texto: no es obligatorio.
            </Text>
          ) : (
            options.map((option) => (
              <Pressable
                key={
                  option.kind === 'model'
                    ? `m:${option.brand}:${option.model}`
                    : `b:${option.brand}`
                }
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  onQueryChange(catalogOptionLabel(option));
                  onSelect(option);
                  Keyboard.dismiss();
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  option.kind === 'model'
                    ? catalogOptionLabel(option)
                    : `${option.brand}, sólo la marca`
                }
              >
                {option.kind === 'model' ? (
                  <DriverIcon
                    name={vehicleIconName(option.category)}
                    size={20}
                    color={driverColors.textSecondary}
                  />
                ) : (
                  <View style={styles.iconSpacer} />
                )}
                <Text style={styles.optionText} numberOfLines={1}>
                  {catalogOptionLabel(option)}
                </Text>
                {option.kind === 'brand' ? (
                  <Text style={styles.tag}>Sólo la marca</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  field: {
    minHeight: 48,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  fieldInvalid: {
    borderColor: driverColors.danger,
    backgroundColor: driverColors.dangerSurface,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: driverColors.text,
    fontSize: 15,
  },
  options: {
    paddingVertical: 6,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
  },
  option: {
    minHeight: 44,
    marginHorizontal: 6,
    paddingHorizontal: driverSpacing.sm - 2,
    borderRadius: driverRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  optionPressed: {
    backgroundColor: driverColors.background,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  iconSpacer: {
    width: 20,
  },
  tag: {
    color: driverColors.textMuted,
    fontSize: 12,
  },
  status: {
    minHeight: 44,
    marginHorizontal: 6,
    paddingHorizontal: driverSpacing.sm - 2,
    borderRadius: driverRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  statusText: {
    flex: 1,
    color: driverColors.textSecondary,
    fontSize: 14,
  },
  empty: {
    paddingVertical: 6,
    paddingHorizontal: driverSpacing.sm,
    color: driverColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
