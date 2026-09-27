import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { driverColors } from '../theme';
import { DriverIcon } from './DriverIcon';
import type { MapPanelProps } from './MapPanel.types';

const MAP_DELTA = 0.085;

export function MapPanel({
  destination,
  parkingLots,
  selectedParking,
  onSelect,
  onMapMoved,
  onRegionChangeComplete,
}: MapPanelProps) {
  const [ready, setReady] = useState(false);
  const initializedRegion = useRef(false);
  const initialRegion: Region = {
    ...destination.coordinate,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };

  return (
    <View style={styles.stage} accessibilityLabel="Mapa de estacionamientos">
      <MapView
        key={destination.id}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsUserLocation={destination.kind === 'current-location'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        onMapReady={() => {
          setReady(true);
        }}
        onRegionChangeComplete={(region) => {
          onRegionChangeComplete({
            latitude: region.latitude,
            longitude: region.longitude,
          });
          if (initializedRegion.current) {
            onMapMoved();
          } else {
            initializedRegion.current = true;
          }
        }}
      >
        <Marker
          coordinate={destination.coordinate}
          accessibilityLabel={
            destination.kind === 'current-location'
              ? 'Tu ubicación aproximada'
              : `Destino: ${destination.name}`
          }
        >
          <View style={styles.destinationMarker}>
            <DriverIcon name="pin" size={17} color={driverColors.surface} />
          </View>
        </Marker>

        {parkingLots.map((parking) => {
          const selected = parking.id === selectedParking?.id;
          return (
            <Marker
              key={`${parking.id}:${parking.availableSpots}:${selected}`}
              coordinate={parking.coordinate}
              onPress={() => {
                onSelect(parking);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${parking.name}, ${parking.priceLabel}, ${parking.availableSpots} lugares disponibles`}
            >
              <View
                style={[
                  styles.parkingMarker,
                  selected && styles.parkingMarkerSelected,
                  parking.availableSpots === 0 && styles.parkingMarkerFull,
                  parking.availableSpots > 0 &&
                    parking.availableSpots < 4 &&
                    styles.parkingMarkerLow,
                ]}
              >
                <DriverIcon
                  name="car"
                  size={selected ? 19 : 17}
                  color={driverColors.surface}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={driverColors.brand} />
          <Text style={styles.loadingText}>Cargando mapa…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: driverColors.mapBackground,
  },
  destinationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: driverColors.surface,
    backgroundColor: driverColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkingMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: driverColors.surface,
    backgroundColor: driverColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parkingMarkerSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: driverColors.brandStrong,
  },
  parkingMarkerLow: {
    backgroundColor: driverColors.warning,
  },
  parkingMarkerFull: {
    backgroundColor: driverColors.danger,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: driverColors.mapBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: driverColors.textSecondary,
    fontSize: 13,
  },
});
