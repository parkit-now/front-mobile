import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import {
  catalogOptionLabel,
  searchCatalog,
  type CatalogItem,
  type CatalogOption,
} from '../vehicleCatalog';
import { vehicleIconName } from '../vehicles';
import { DriverIcon } from './DriverIcon';

type Props = {
  /** Pide el catálogo; se llama al abrir y al reintentar. */
  loadCatalog: () => Promise<CatalogItem[]>;
  /** Hay marca o modelo cargados: se ofrece quitarlos. */
  hasValue: boolean;
  onSelect: (option: CatalogOption) => void;
  onClear: () => void;
  onClose: () => void;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: CatalogItem[] };

/**
 * Buscador de marca y modelo sobre el catálogo de la plataforma (SCRUM-301).
 * Ocupa toda la pantalla y se dibuja DENTRO del Modal del formulario: con el
 * teclado abierto un desplegable no entra en el diálogo, y otro Modal nativo
 * encima falla con Fabric. No acepta texto libre: se elige una opción o nada.
 */
export function VehicleCatalogPicker({
  loadCatalog,
  hasValue,
  onSelect,
  onClear,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadCatalog()
      .then((items) => {
        if (!cancelled) setState({ status: 'ready', items });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [loadCatalog]);

  useEffect(() => load(), [load]);

  const options = useMemo(
    () => (state.status === 'ready' ? searchCatalog(state.items, query) : []),
    [state, query],
  );
  const hasQuery = query.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        // En Android el Modal ya arranca debajo de la barra de estado.
        {
          paddingTop:
            (Platform.OS === 'ios' ? insets.top : 0) + driverSpacing.sm,
          paddingBottom: insets.bottom,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      accessibilityViewIsModal
    >
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <DriverIcon name="back" size={24} color={driverColors.text} />
        </Pressable>
        <Text style={styles.title}>Marca y modelo</Text>
      </View>

      <View style={styles.searchField}>
        <DriverIcon name="search" size={20} color={driverColors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscá tu vehículo, por ejemplo Etios"
          placeholderTextColor={driverColors.disabled}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxLength={60}
          accessibilityLabel="Buscar marca o modelo"
          testID="vehicle-catalog-search"
        />
        {hasQuery ? (
          <Pressable
            onPress={() => {
              setQuery('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            hitSlop={8}
          >
            <DriverIcon name="close" size={18} color={driverColors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {state.status === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={driverColors.brand} />
          <Text style={styles.message}>Cargando vehículos...</Text>
        </View>
      ) : state.status === 'error' ? (
        <View style={styles.centered}>
          <Text style={styles.message}>
            No pudimos cargar la lista de vehículos.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            onPress={load}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={options}
          keyExtractor={(option) =>
            option.kind === 'model'
              ? `m:${option.brand}:${option.model}`
              : `b:${option.brand}`
          }
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.option,
                pressed && styles.optionPressed,
              ]}
              onPress={() => {
                onSelect(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                item.kind === 'model'
                  ? catalogOptionLabel(item)
                  : `${item.brand}, sólo la marca`
              }
            >
              {item.kind === 'model' ? (
                <DriverIcon
                  name={vehicleIconName(item.category)}
                  size={20}
                  color={driverColors.textSecondary}
                />
              ) : (
                <View style={styles.iconSpacer} />
              )}
              <Text style={styles.optionText} numberOfLines={1}>
                {catalogOptionLabel(item)}
              </Text>
              {item.kind === 'brand' ? (
                <Text style={styles.tag}>Sólo la marca</Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {hasQuery
                ? 'No encontramos ese vehículo. Probá con la marca sola, o dejalo sin marca y modelo: no es obligatorio.'
                : 'Escribí la marca o el modelo y elegilo de la lista.'}
            </Text>
          }
          ListFooterComponent={
            hasValue ? (
              <Pressable
                style={({ pressed }) => [
                  styles.clear,
                  pressed && styles.pressed,
                ]}
                onPress={onClear}
                accessibilityRole="button"
              >
                <Text style={styles.clearText}>Quitar marca y modelo</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: driverSpacing.md,
    backgroundColor: driverColors.surface,
    gap: driverSpacing.sm,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: driverColors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  searchField: {
    minHeight: 48,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.brand,
    backgroundColor: driverColors.brandSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: driverColors.text,
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: driverSpacing.sm,
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: driverSpacing.sm,
  },
  message: {
    color: driverColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
  empty: {
    paddingVertical: driverSpacing.md,
    paddingHorizontal: driverSpacing.sm,
    color: driverColors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    minHeight: 44,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  clear: {
    minHeight: 44,
    marginTop: driverSpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: driverColors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
