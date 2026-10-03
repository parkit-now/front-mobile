import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { availabilityLabel, availabilityLevel } from '../availability';
import { DriverIcon } from '../components/DriverIcon';
import { MapPanel } from '../components/MapPanel';
import { formatArs, PriceFilterSheet } from '../components/PriceFilterSheet';
import type { Coordinate } from '../geo';
import { useDriverData } from '../hooks/useDriverData';
import { useNearbyParkings } from '../hooks/useNearbyParkings';
import type { ParkingLot } from '../mock';
import type { DiscoveryStackParamList } from '../navigation';
import { filterMapParkingLots, priceSliderBounds } from '../selectors';
import { openDirections } from '../services/directions';
import {
  availabilityColors,
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'MapResults'>;

export function MapResultsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { accessToken } = useDriverData();
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxHourlyPriceArs, setMaxHourlyPriceArs] = useState<number | null>(
    null,
  );
  // Sin selección explícita se destaca la primera según el orden actual (la
  // más cercana al destino por defecto).
  const [selectedParkingId, setSelectedParkingId] = useState<string>();
  const [mapMoved, setMapMoved] = useState(false);
  const [searchCenter, setSearchCenter] = useState<Coordinate>(
    route.params.destination.coordinate,
  );
  const [visibleRegionCenter, setVisibleRegionCenter] = useState<Coordinate>(
    route.params.destination.coordinate,
  );
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const updatedTime = updatedAt.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const sheetSnapPoints = useMemo(() => ['34%', '58%'], []);
  const nearby = useNearbyParkings(searchCenter, accessToken);
  const showingNearest = false;
  const discoveredParkingLots = nearby.parkings;
  // El filtro de precio trabaja sobre las cocheras ya filtradas por
  // disponibilidad, para que el conteo en vivo del slider sea real.
  const priceCandidates = useMemo(
    () =>
      filterMapParkingLots(discoveredParkingLots, {
        availableOnly,
        maxHourlyPriceArs: null,
      }),
    [availableOnly, discoveredParkingLots],
  );
  const priceBounds = useMemo(
    () => priceSliderBounds(priceCandidates),
    [priceCandidates],
  );
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);
  // El descubrimiento ya viene ordenado por distancia al destino.
  const parkingLots = useMemo(
    () =>
      filterMapParkingLots(discoveredParkingLots, {
        availableOnly,
        maxHourlyPriceArs,
      }),
    [availableOnly, discoveredParkingLots, maxHourlyPriceArs],
  );

  const selectedParking =
    parkingLots.find((parking) => parking.id === selectedParkingId) ??
    parkingLots[0];

  async function handleDirections(parking: ParkingLot) {
    const opened = await openDirections(parking.coordinate);
    if (!opened) {
      showToast({
        message: 'No pudimos abrir la aplicación de mapas.',
        kind: 'error',
      });
    }
  }

  return (
    <View style={styles.page}>
      <MapPanel
        destination={route.params.destination}
        parkingLots={parkingLots}
        selectedParking={selectedParking}
        onSelect={(parking) => {
          setSelectedParkingId(parking.id);
        }}
        onMapMoved={() => {
          setMapMoved(true);
        }}
        onRegionChangeComplete={setVisibleRegionCenter}
      />

      <View
        style={[styles.topControls, { top: insets.top + driverSpacing.sm }]}
      >
        <View style={styles.destinationBar}>
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
          <Pressable
            style={({ pressed }) => [
              styles.destinationButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              navigation.replace('DestinationSearch');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Cambiar destino, actual ${route.params.destination.name}`}
          >
            <Text style={styles.destinationName} numberOfLines={1}>
              {route.params.destination.name}
            </Text>
            <Text style={styles.destinationHint} numberOfLines={1}>
              Cocheras Parkit cerca de tu destino
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Pressable
            style={({ pressed }) => [
              styles.filter,
              availableOnly && styles.filterActive,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setAvailableOnly((current) => !current);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: availableOnly }}
          >
            <View style={styles.availableDot} />
            <Text
              style={[
                styles.filterText,
                availableOnly && styles.filterTextActive,
              ]}
            >
              Disponible ahora
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.filter,
              maxHourlyPriceArs !== null && styles.filterActive,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setPriceSheetOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              maxHourlyPriceArs === null
                ? 'Filtrar por precio'
                : `Precio hasta ${formatArs(maxHourlyPriceArs)}. Tocar para cambiar`
            }
          >
            <Text
              style={[
                styles.filterText,
                maxHourlyPriceArs !== null && styles.filterTextActive,
              ]}
            >
              {maxHourlyPriceArs === null
                ? 'Precio'
                : `Hasta ${formatArs(maxHourlyPriceArs)}`}
            </Text>
            {maxHourlyPriceArs !== null ? (
              <Pressable
                onPress={() => {
                  setMaxHourlyPriceArs(null);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Quitar filtro de precio"
              >
                <DriverIcon
                  name="close"
                  size={16}
                  color={driverColors.surface}
                />
              </Pressable>
            ) : null}
          </Pressable>
        </ScrollView>

        {mapMoved ? (
          <Pressable
            style={({ pressed }) => [
              styles.searchAreaButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setSearchCenter(visibleRegionCenter);
              setMapMoved(false);
              setUpdatedAt(new Date());
              showToast({
                message: 'Resultados actualizados en esta zona.',
                kind: 'success',
              });
            }}
            accessibilityRole="button"
          >
            <DriverIcon name="search" size={17} color={driverColors.surface} />
            <Text style={styles.searchAreaText}>Buscar en esta zona</Text>
          </Pressable>
        ) : null}
      </View>

      <BottomSheet
        index={0}
        snapPoints={sheetSnapPoints}
        enablePanDownToClose={false}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        style={styles.sheetShadow}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.resultsSheetContent,
            { paddingBottom: Math.max(insets.bottom, driverSpacing.md) },
          ]}
        >
          {selectedParking ? (
            <>
              <ParkingPreview
                parking={selectedParking}
                parkingCount={parkingLots.length}
                updatedTime={updatedTime}
                showingNearest={showingNearest}
                onDirections={() => {
                  void handleDirections(selectedParking);
                }}
                onDetails={() => {
                  navigation.navigate('ParkingDetails', {
                    parking: selectedParking,
                  });
                }}
              />
              {parkingLots.length > 1 ? (
                <View style={styles.otherResults}>
                  <Text style={styles.otherResultsTitle}>
                    Otras cocheras cercanas
                  </Text>
                  {parkingLots
                    .filter((parking) => parking.id !== selectedParking.id)
                    .map((parking) => (
                      <Pressable
                        key={parking.id}
                        style={({ pressed }) => [
                          styles.otherResultRow,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => {
                          setSelectedParkingId(parking.id);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Seleccionar ${parking.name}, ${parking.distance}, ${parking.priceLabel}`}
                      >
                        <View style={styles.otherResultCopy}>
                          <Text
                            style={styles.otherResultName}
                            numberOfLines={1}
                          >
                            {parking.name}
                          </Text>
                          <Text style={styles.otherResultMeta}>
                            {parking.distance} · {parking.eta} caminando
                          </Text>
                        </View>
                        <View style={styles.otherResultPrice}>
                          <Text style={styles.otherResultPriceValue}>
                            {parking.priceLabel.replace('/h', '')}
                          </Text>
                          <Text
                            style={[
                              styles.otherResultAvailability,
                              {
                                color:
                                  availabilityColors[
                                    availabilityLevel(
                                      parking.availableSpots,
                                      parking.totalSpots,
                                    )
                                  ].text,
                              },
                            ]}
                          >
                            {parking.availableSpots === null
                              ? 'Sin datos'
                              : `${parking.availableSpots} libres`}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              {nearby.status === 'loading' ? (
                <ActivityIndicator color={driverColors.brand} />
              ) : null}
              <Text style={styles.emptyTitle}>
                {nearby.status === 'loading'
                  ? 'Buscando cocheras cercanas…'
                  : nearby.status === 'error'
                    ? 'No pudimos cargar las cocheras'
                    : nearby.parkings.length === 0
                      ? 'Todavía no operamos en esta zona'
                      : 'No hay cocheras con estos filtros'}
              </Text>
              <Text style={styles.emptyCopy}>
                {nearby.status === 'error'
                  ? 'Revisá tu conexión y volvé a intentar.'
                  : nearby.parkings.length === 0
                    ? 'Mové el mapa para buscar en otra zona.'
                    : 'Probá cambiando el vehículo, el precio o la disponibilidad.'}
              </Text>
              {nearby.status !== 'loading' && nearby.parkings.length > 0 ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.resetButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    if (nearby.status === 'error') {
                      nearby.retry();
                      return;
                    }
                    setAvailableOnly(false);
                    setMaxHourlyPriceArs(null);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.resetText}>
                    {nearby.status === 'error'
                      ? 'Reintentar'
                      : 'Quitar filtros'}
                  </Text>
                </Pressable>
              ) : nearby.status === 'error' ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.resetButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={nearby.retry}
                  accessibilityRole="button"
                >
                  <Text style={styles.resetText}>Reintentar</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {priceSheetOpen ? (
        <PriceFilterSheet
          bounds={priceBounds}
          prices={priceCandidates.map((parking) => parking.hourlyPriceArs)}
          selected={maxHourlyPriceArs}
          onApply={(value) => {
            setMaxHourlyPriceArs(value);
            setPriceSheetOpen(false);
          }}
          onClose={() => {
            setPriceSheetOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

type ParkingPreviewProps = {
  parking: ParkingLot;
  parkingCount: number;
  updatedTime: string;
  showingNearest: boolean;
  onDirections: () => void;
  onDetails: () => void;
};

function ParkingPreview({
  parking,
  parkingCount,
  updatedTime,
  showingNearest,
  onDirections,
  onDetails,
}: ParkingPreviewProps) {
  const availability =
    availabilityColors[
      availabilityLevel(parking.availableSpots, parking.totalSpots)
    ];

  return (
    <>
      {showingNearest ? (
        <View style={styles.coverageNotice}>
          <Text style={styles.coverageTitle}>
            Todavía no operamos en esta zona
          </Text>
          <Text style={styles.coverageCopy}>
            Estas son las cocheras Parkit más cercanas.
          </Text>
        </View>
      ) : null}
      <View style={styles.resultsMeta}>
        <Text style={styles.resultsCount}>
          {parkingCount}{' '}
          {parkingCount === 1
            ? 'cochera Parkit cerca'
            : 'cocheras Parkit cerca'}
        </Text>
        <Text style={styles.updatedAt}>Actualizado {updatedTime}</Text>
      </View>

      <View style={styles.parkingSummary}>
        <View style={styles.parkingIcon}>
          <DriverIcon name="car" size={22} color={driverColors.brand} />
        </View>
        <View style={styles.parkingCopy}>
          <Text style={styles.parkingName}>{parking.name}</Text>
          <Text style={styles.parkingAddress} numberOfLines={1}>
            {parking.address}
          </Text>
          <Text style={styles.parkingDistance}>
            {parking.distance} · {parking.eta} caminando
          </Text>
        </View>
        <View style={styles.parkingPrice}>
          <Text style={styles.priceValue}>
            {parking.priceLabel.replace('/h', '')}
          </Text>
          <Text style={styles.priceUnit}>por hora</Text>
        </View>
      </View>

      <View style={styles.availabilityRow}>
        <View
          style={[
            styles.availabilityBadge,
            { backgroundColor: availability.surface },
          ]}
        >
          <View
            style={[
              styles.availabilityBadgeDot,
              { backgroundColor: availability.marker },
            ]}
          />
          <Text style={[styles.availabilityText, { color: availability.text }]}>
            {availabilityLabel(parking.availableSpots)}
          </Text>
        </View>
        <Text style={styles.disclaimer}>No garantiza lugar</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.directionsButton,
            pressed && styles.pressed,
          ]}
          onPress={onDirections}
          accessibilityRole="button"
          accessibilityLabel="Cómo llegar con Google Maps"
        >
          <DriverIcon name="directions" size={24} color={driverColors.brand} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.detailsButton,
            pressed && styles.pressed,
          ]}
          onPress={onDetails}
          accessibilityRole="button"
        >
          <Text style={styles.detailsButtonText}>Ver estacionamiento</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: driverColors.mapBackground },
  topControls: {
    position: 'absolute',
    left: driverSpacing.sm,
    right: driverSpacing.sm,
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    gap: driverSpacing.sm,
  },
  destinationBar: {
    minHeight: 56,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: driverColors.text,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationButton: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    paddingRight: driverSpacing.sm,
    justifyContent: 'center',
  },
  destinationName: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  destinationHint: {
    marginTop: 2,
    color: driverColors.textSecondary,
    fontSize: 12,
  },
  filters: { paddingRight: driverSpacing.lg, gap: driverSpacing.xs },
  filter: {
    minHeight: 38,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterActive: {
    borderColor: driverColors.brand,
    backgroundColor: driverColors.brand,
  },
  filterText: {
    color: driverColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: { color: driverColors.surface },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7bdba4',
  },
  searchAreaButton: {
    minHeight: 42,
    alignSelf: 'center',
    paddingHorizontal: driverSpacing.md,
    borderRadius: 21,
    backgroundColor: driverColors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  searchAreaText: {
    color: driverColors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  resultsSheetContent: {
    paddingHorizontal: driverSpacing.md,
    gap: driverSpacing.sm,
  },
  sheetBackground: {
    borderTopLeftRadius: driverRadius.card,
    borderTopRightRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
  },
  sheetShadow: {
    shadowColor: driverColors.text,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -7 },
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: driverColors.border,
  },
  coverageNotice: {
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.warningSurface,
    gap: 3,
  },
  coverageTitle: {
    color: driverColors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  coverageCopy: {
    color: driverColors.textSecondary,
    fontSize: 12,
  },
  resultsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: driverSpacing.sm,
  },
  resultsCount: {
    flex: 1,
    color: driverColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  updatedAt: { color: driverColors.textMuted, fontSize: 11 },
  parkingSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: driverSpacing.sm,
  },
  parkingIcon: {
    width: 44,
    height: 44,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkingCopy: { flex: 1, minWidth: 0, gap: 3 },
  parkingName: {
    color: driverColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  parkingAddress: { color: driverColors.textSecondary, fontSize: 13 },
  parkingDistance: { color: driverColors.textSecondary, fontSize: 13 },
  parkingPrice: { alignItems: 'flex-end' },
  priceValue: {
    color: driverColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  priceUnit: { color: driverColors.textMuted, fontSize: 11 },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: driverSpacing.xs,
  },
  availabilityBadge: {
    minHeight: 26,
    paddingHorizontal: driverSpacing.xs,
    borderRadius: driverRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimer: { color: driverColors.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: driverSpacing.sm },
  directionsButton: {
    width: 50,
    height: 50,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: driverColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  otherResults: {
    marginTop: driverSpacing.xs,
    paddingTop: driverSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: driverColors.border,
    gap: driverSpacing.xs,
  },
  otherResultsTitle: {
    color: driverColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  otherResultRow: {
    minHeight: 58,
    paddingVertical: driverSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  otherResultCopy: { flex: 1, minWidth: 0, gap: 3 },
  otherResultName: {
    color: driverColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  otherResultMeta: { color: driverColors.textSecondary, fontSize: 12 },
  otherResultPrice: { alignItems: 'flex-end', gap: 3 },
  otherResultPriceValue: {
    color: driverColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  otherResultAvailability: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: driverSpacing.sm,
    alignItems: 'center',
    gap: driverSpacing.xs,
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
  resetButton: {
    minHeight: 44,
    marginTop: driverSpacing.xs,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: driverColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: { opacity: 0.75 },
});
