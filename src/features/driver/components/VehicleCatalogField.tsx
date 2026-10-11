import { useCallback, useRef, useState } from 'react';
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
import { Popover } from './FloatingLayer';

// Con dos o tres letras más la lista ya se achica sola; lo que no entra en el
// panel se scrollea adentro.
const MAX_OPTIONS = 8;
const PANEL_MAX_HEIGHT = 280;

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
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: CatalogItem[] };

/**
 * Marca y modelo sobre el catálogo de la plataforma (SCRUM-301). El conductor
 * escribe y las coincidencias flotan ancladas al campo, sin cambiar el tamaño
 * del formulario (ver FloatingLayer; requiere un FloatingLayerHost arriba). No
 * hay texto libre: lo escrito sólo sirve para buscar, y vale lo que se elige
 * de la lista. Borrar el campo quita marca y modelo.
 */
export function VehicleCatalogField({
  query,
  onQueryChange,
  selectedLabel,
  onSelect,
  loadCatalog,
  invalid = false,
}: Props) {
  const anchorRef = useRef<View>(null);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  // Tocar afuera cierra las opciones hasta que se vuelva a escribir.
  const [dismissed, setDismissed] = useState(false);

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
    <>
      <View
        ref={anchorRef}
        collapsable={false}
        style={[styles.field, invalid && styles.fieldInvalid]}
      >
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(value) => {
            setDismissed(false);
            onQueryChange(value);
            if (value.trim().length === 0 && selectedLabel) onSelect(null);
          }}
          onFocus={() => {
            if (state.status === 'idle' || state.status === 'error') load();
            setDismissed(false);
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

      <Popover
        open={searching && !dismissed}
        onClose={() => {
          setDismissed(true);
        }}
        anchorRef={anchorRef}
        maxHeight={PANEL_MAX_HEIGHT}
        keepKeyboard
        accessibilityLabel="Vehículos que coinciden"
        testID="vehicle-catalog-options"
      >
        <View style={styles.options}>
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
      </Popover>
    </>
  );
}

const styles = StyleSheet.create({
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
