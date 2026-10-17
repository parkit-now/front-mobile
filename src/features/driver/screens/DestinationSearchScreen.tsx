import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
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
import type { SearchDestination } from '../discovery';
import type { ParkingLot } from '../mock';
import { useDriverData } from '../hooks/useDriverData';
import { useRecentDestinations } from '../hooks/useRecentDestinations';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useDestinationSearch } from '../hooks/useDestinationSearch';
import type { DiscoveryStackParamList } from '../navigation';
import { buildSearchRows } from '../searchRows';
import { driverColors, driverRadius, driverSpacing } from '../theme';

type Props = NativeStackScreenProps<
  DiscoveryStackParamList,
  'DestinationSearch'
>;

export function DestinationSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const currentLocation = useCurrentLocation();
  const { accessToken } = useDriverData();
  const { recents, remember } = useRecentDestinations();
  const search = useDestinationSearch(query, accessToken);
  const hasQuery = query.trim().length >= 3;
  const hasError = search.status === 'error';
  const showingResults = hasQuery && !hasError;
  const rows = buildSearchRows({
    query,
    showingResults,
    places: search.places,
    addresses: search.results,
    recents,
  });
  const visibleParkings = showingResults ? search.parkings : [];

  function selectParking(parking: ParkingLot) {
    Keyboard.dismiss();
    remember({
      id: `parking-${parking.id}`,
      name: parking.name,
      address: parking.address,
      kind: 'place',
      coordinate: parking.coordinate,
    });
    navigation.navigate('ParkingDetails', { parking });
  }

  // Una calle sin altura no es un destino: se completa el buscador para que el
  // conductor agregue la altura.
  function completeStreet(street: SearchDestination) {
    setQuery(`${street.name} `);
    inputRef.current?.focus();
  }

  function selectDestination(destination: SearchDestination) {
    Keyboard.dismiss();
    remember(destination);
    navigation.popTo('MapResults', { destination });
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
              ref={inputRef}
              autoFocus
              value={query}
              onChangeText={setQuery}
              style={styles.input}
              placeholder="Estacionamiento, dirección o esquina"
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
                }}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <DriverIcon name="close" size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {search.status === 'loading' ? (
          <View style={styles.statusRow}>
            <View style={styles.loadingDot} />
            <Text style={styles.statusText}>Buscando…</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                {hasError ? (
                  <View style={styles.errorState}>
                    <Text style={styles.errorTitle}>
                      No pudimos buscar direcciones
                    </Text>
                    <Text style={styles.errorCopy}>
                      Revisá tu conexión. Tu búsqueda quedó guardada.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={search.retry}
                      accessibilityRole="button"
                    >
                      <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                  </View>
                ) : (
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
                )}
                {visibleParkings.length > 0 ? (
                  <>
                    <Text style={styles.listLabel}>ESTACIONAMIENTOS</Text>
                    {visibleParkings.map((parking) => (
                      <Pressable
                        key={parking.id}
                        style={({ pressed }) => [
                          styles.resultRow,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => {
                          selectParking(parking);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Estacionamiento ${parking.name}, ${parking.address}`}
                      >
                        <View style={styles.rowIcon}>
                          <DriverIcon
                            name="car"
                            size={18}
                            color={driverColors.brand}
                          />
                        </View>
                        <View style={styles.resultCopy}>
                          <Text style={styles.resultName}>{parking.name}</Text>
                          <Text style={styles.resultAddress} numberOfLines={1}>
                            {parking.distance
                              ? `${parking.address} · ${parking.distance}`
                              : parking.address}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </>
                ) : null}
              </>
            }
            renderItem={({ item: row }) =>
              row.type === 'label' ? (
                <Text style={styles.listLabel}>{row.text}</Text>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.resultRow,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    if (row.destination.kind === 'street') {
                      completeStreet(row.destination);
                    } else {
                      selectDestination(row.destination);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.destination.name}, ${row.destination.address}`}
                >
                  <View style={styles.rowIcon}>
                    <DriverIcon
                      name={showingResults ? 'pin' : 'clock'}
                      size={18}
                      color={driverColors.brand}
                    />
                  </View>
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultName}>
                      {row.destination.name}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {row.destination.kind === 'street'
                        ? `Agregá la altura · ${row.destination.address}`
                        : row.destination.address}
                    </Text>
                  </View>
                </Pressable>
              )
            }
            ListEmptyComponent={
              showingResults && visibleParkings.length === 0 ? (
                <View style={styles.emptyState}>
                  <DriverIcon
                    name="search"
                    size={30}
                    color={driverColors.disabled}
                  />
                  <Text style={styles.emptyTitle}>
                    Sin resultados para “{query.trim()}”
                  </Text>
                  <Text style={styles.emptyCopy}>
                    Probá con la calle y la altura, el nombre de un lugar o de
                    un estacionamiento.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.emptyAction,
                      pressed && styles.pressed,
                    ]}
                    // "Usar mi ubicación actual" ya está arriba; la salida que
                    // falta es ir a la zona moviendo el mapa.
                    onPress={() => {
                      Keyboard.dismiss();
                      navigation.popTo('MapResults', {
                        destination: undefined,
                      });
                    }}
                    accessibilityRole="button"
                  >
                    <DriverIcon name="pin" size={19} />
                    <Text style={styles.emptyActionText}>
                      Buscar en el mapa
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
  errorState: {
    margin: driverSpacing.md,
    padding: driverSpacing.md,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.dangerSurface,
    gap: driverSpacing.xs,
  },
  errorTitle: {
    color: driverColors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  errorCopy: {
    color: driverColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    minHeight: 44,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: driverColors.text,
    fontSize: 14,
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
