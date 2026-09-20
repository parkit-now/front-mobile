import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverIcon } from '../components/DriverIcon';
import { LocationIssueModal } from '../components/LocationIssueModal';
import {
  RECENT_DESTINATIONS,
  searchDestinations,
  type SearchDestination,
} from '../discovery';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import type { DiscoveryStackParamList } from '../navigation';
import { driverColors, driverRadius, driverSpacing } from '../theme';

type Props = NativeStackScreenProps<
  DiscoveryStackParamList,
  'DestinationSearch'
>;

export function DestinationSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const currentLocation = useCurrentLocation();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSettledQuery(query);
    }, 300);
    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  const searching = query.trim().length >= 3 && query !== settledQuery;
  const results = useMemo(
    () => searchDestinations(settledQuery),
    [settledQuery],
  );
  const hasQuery = settledQuery.trim().length >= 3;
  const visibleDestinations = hasQuery ? results : RECENT_DESTINATIONS;

  function selectDestination(destination: SearchDestination) {
    Keyboard.dismiss();
    navigation.replace('MapResults', { destination });
  }

  async function selectCurrentLocation() {
    const destination = await currentLocation.request();
    if (destination) selectDestination(destination);
  }

  return (
    <>
      <View style={[styles.page, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <DriverIcon name="back" size={22} color={driverColors.text} />
          </Pressable>
          <View style={styles.inputWrap}>
            <DriverIcon name="search" size={19} color={driverColors.brand} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              style={styles.input}
              placeholder="Dirección, lugar o esquina"
              placeholderTextColor={driverColors.textMuted}
              returnKeyType="search"
              autoCapitalize="words"
              accessibilityLabel="Destino"
            />
            {query.length > 0 ? (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setQuery('');
                  setSettledQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <DriverIcon name="close" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {searching ? (
          <View style={styles.statusRow}>
            <View style={styles.loadingDot} />
            <Text style={styles.statusText}>Buscando direcciones…</Text>
          </View>
        ) : (
          <FlatList
            data={visibleDestinations}
            keyExtractor={(destination) => destination.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.locationRow,
                    currentLocation.pending && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    void selectCurrentLocation();
                  }}
                  disabled={currentLocation.pending}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: currentLocation.pending,
                    busy: currentLocation.pending,
                  }}
                >
                  <View style={styles.rowIcon}>
                    <DriverIcon
                      name="current-location"
                      size={19}
                      color={driverColors.brand}
                    />
                  </View>
                  <Text style={styles.locationText}>
                    {currentLocation.pending
                      ? 'Buscando ubicación…'
                      : 'Usar mi ubicación actual'}
                  </Text>
                </Pressable>
                {!hasQuery ? (
                  <Text style={styles.listLabel}>DESTINOS RECIENTES</Text>
                ) : null}
              </>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.resultRow,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  selectDestination(item);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.address}`}
              >
                <View style={styles.rowIcon}>
                  <DriverIcon
                    name={hasQuery ? 'pin' : 'clock'}
                    size={18}
                    color={driverColors.brand}
                  />
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              hasQuery ? (
                <View style={styles.emptyState}>
                  <DriverIcon
                    name="search"
                    size={30}
                    color={driverColors.disabled}
                  />
                  <Text style={styles.emptyTitle}>
                    Sin resultados para “{settledQuery.trim()}”
                  </Text>
                  <Text style={styles.emptyCopy}>
                    Probá con el nombre de la calle y la altura, o con un lugar
                    conocido de CABA.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyAction,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      void selectCurrentLocation();
                    }}
                    disabled={currentLocation.pending}
                    accessibilityRole="button"
                  >
                    <DriverIcon name="current-location" size={19} />
                    <Text style={styles.emptyActionText}>
                      Estacionar cerca mío
                    </Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        )}
      </View>
      <LocationIssueModal
        issue={currentLocation.issue}
        pending={currentLocation.pending}
        onClose={currentLocation.clearIssue}
        onRetry={() => {
          void selectCurrentLocation();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: driverColors.surface,
  },
  header: {
    paddingHorizontal: driverSpacing.sm,
    paddingVertical: driverSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  backButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.brand,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: driverColors.text,
    fontSize: 16,
  },
  clearButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    minHeight: 56,
    paddingHorizontal: driverSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: driverColors.brand,
  },
  statusText: {
    color: driverColors.textSecondary,
    fontSize: 13,
  },
  locationRow: {
    minHeight: 60,
    paddingHorizontal: driverSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    color: driverColors.brand,
    fontSize: 15,
    fontWeight: '600',
  },
  listLabel: {
    paddingHorizontal: driverSpacing.md,
    paddingTop: driverSpacing.md,
    paddingBottom: driverSpacing.xs,
    color: driverColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  resultRow: {
    minHeight: 72,
    paddingHorizontal: driverSpacing.md,
    paddingVertical: driverSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  resultName: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  resultAddress: {
    color: driverColors.textSecondary,
    fontSize: 13,
  },
  emptyState: {
    paddingHorizontal: driverSpacing.lg,
    paddingTop: 52,
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  emptyTitle: {
    color: driverColors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyCopy: {
    color: driverColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyAction: {
    minHeight: 48,
    marginTop: driverSpacing.xs,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  emptyActionText: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.62,
  },
});
