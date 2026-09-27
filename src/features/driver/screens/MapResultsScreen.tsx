import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { DriverIcon } from '../components/DriverIcon';
import { MapPanel } from '../components/MapPanel';
import {
  discoverParkingLots,
  type Coordinate,
  type DiscoveredParkingLot,
} from '../geo';
import {
  PARKING_LOTS,
  VEHICLE_KINDS,
  type ParkingLot,
  type VehicleKind,
} from '../mock';
import type { DiscoveryStackParamList } from '../navigation';
import { filterMapParkingLots } from '../selectors';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'MapResults'>;

const PRICE_FILTERS: Array<number | null> = [null, 2000, 2500];

export function MapResultsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>('Auto');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxHourlyPriceArs, setMaxHourlyPriceArs] = useState<number | null>(
    null,
  );
  const [selectedParkingId, setSelectedParkingId] = useState(
    PARKING_LOTS[0]?.id,
  );
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
  const discovery = useMemo(
    () => discoverParkingLots(PARKING_LOTS, searchCenter),
    [searchCenter],
  );
  const showingNearest = discovery.nearby.length === 0;
  const discoveredParkingLots = showingNearest
    ? discovery.nearestFallback
    : discovery.nearby;
  const parkingLots = useMemo(
    () =>
      filterMapParkingLots(discoveredParkingLots, {
        vehicleKind,
        availableOnly,
        maxHourlyPriceArs,
      }),
    [availableOnly, discoveredParkingLots, maxHourlyPriceArs, vehicleKind],
  );
  const selectedParking =
    parkingLots.find((parking) => parking.id === selectedParkingId) ??
    parkingLots[0];

  function cycleVehicle() {
    const currentIndex = VEHICLE_KINDS.indexOf(vehicleKind);
    setVehicleKind(VEHICLE_KINDS[(currentIndex + 1) % VEHICLE_KINDS.length]);
  }

  function cyclePriceFilter() {
    const currentIndex = PRICE_FILTERS.indexOf(maxHourlyPriceArs);
    setMaxHourlyPriceArs(
      PRICE_FILTERS[(currentIndex + 1) % PRICE_FILTERS.length],
    );
  }

  async function openDirections(parking: ParkingLot) {
    const destination = `${parking.coordinate.latitude},${parking.coordinate.longitude}`;
    try {
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      );
    } catch {
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
              styles.activeFilter,
              pressed && styles.pressed,
            ]}
            onPress={cycleVehicle}
            accessibilityRole="button"
            accessibilityLabel={`Vehículo: ${vehicleKind}. Tocar para cambiar`}
          >
            <Text style={styles.activeFilterText}>{vehicleKind}</Text>
          </Pressable>
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
            style={({ pressed }) => [styles.filter, pressed && styles.pressed]}
            onPress={cyclePriceFilter}
            accessibilityRole="button"
            accessibilityLabel="Cambiar filtro de precio"
          >
            <Text style={styles.filterText}>
              {maxHourlyPriceArs === null
                ? 'Precio'
                : `Hasta $${maxHourlyPriceArs.toLocaleString('es-AR')}`}
            </Text>
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
                  void openDirections(selectedParking);
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
                        accessibilityLabel={`Seleccionar ${parking.name}, ${parking.distanceLabel}, ${parking.priceLabel}`}
                      >
                        <View style={styles.otherResultCopy}>
                          <Text
                            style={styles.otherResultName}
                            numberOfLines={1}
                          >
                            {parking.name}
                          </Text>
                          <Text style={styles.otherResultMeta}>
                            {parking.distanceLabel} · {parking.walkingTimeLabel}
                          </Text>
                        </View>
                        <View style={styles.otherResultPrice}>
                          <Text style={styles.otherResultPriceValue}>
                            {parking.priceLabel.replace('/h', '')}
                          </Text>
                          <Text style={styles.otherResultAvailability}>
                            {parking.availableSpots} libres
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                No hay cocheras con estos filtros
              </Text>
              <Text style={styles.emptyCopy}>
                Probá cambiando el vehículo, el precio o la disponibilidad.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setVehicleKind('Auto');
                  setAvailableOnly(false);
                  setMaxHourlyPriceArs(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.resetText}>Quitar filtros</Text>
              </Pressable>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

type ParkingPreviewProps = {
  parking: DiscoveredParkingLot;
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
  const lowAvailability = parking.availableSpots < 4;

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
            {parking.distanceLabel} · {parking.walkingTimeLabel}
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
            lowAvailability && styles.availabilityBadgeLow,
          ]}
        >
          <View
            style={[
              styles.availabilityBadgeDot,
              lowAvailability && styles.availabilityBadgeDotLow,
            ]}
          />
          <Text
            style={[
              styles.availabilityText,
              lowAvailability && styles.availabilityTextLow,
            ]}
          >
            {parking.availableSpots}{' '}
            {parking.availableSpots === 1
              ? 'lugar libre ahora'
              : 'lugares libres ahora'}
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
          accessibilityLabel="Abrir indicaciones"
        >
          <DriverIcon name="arrow" size={20} />
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
  activeFilter: {
    minHeight: 38,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: 19,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterText: {
    color: driverColors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
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
    backgroundColor: driverColors.successSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityBadgeLow: { backgroundColor: driverColors.warningSurface },
  availabilityBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: driverColors.success,
  },
  availabilityBadgeDotLow: { backgroundColor: driverColors.warning },
  availabilityText: {
    color: driverColors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  availabilityTextLow: { color: driverColors.warning },
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
    color: driverColors.success,
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
