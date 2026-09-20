import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
}: MapPanelProps) {
  const [ready, setReady] = useState(false);
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
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsCompass={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        onMapReady={() => {
          setReady(true);
        }}
        onPanDrag={onMapMoved}
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
              key={parking.id}
              coordinate={parking.coordinate}
              onPress={() => {
                onSelect(parking);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${parking.name}, ${parking.priceLabel}, ${parking.availableSpots} lugares disponibles`}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                <View
                  style={[
                    styles.availabilityDot,
                    parking.availableSpots === 0 && styles.availabilityDotFull,
                    parking.availableSpots > 0 &&
                      parking.availableSpots < 4 &&
                      styles.availabilityDotLow,
                  ]}
                />
                <Text
                  style={[
                    styles.markerPrice,
                    selected && styles.markerPriceSelected,
                  ]}
                >
                  {parking.priceLabel.replace('/h', '')}
                </Text>
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
  marker: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markerSelected: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderColor: driverColors.brandStrong,
    backgroundColor: driverColors.brandStrong,
  },
  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: driverColors.success,
  },
  availabilityDotLow: {
    backgroundColor: driverColors.warning,
  },
  availabilityDotFull: {
    backgroundColor: driverColors.danger,
  },
  markerPrice: {
    color: driverColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  markerPriceSelected: {
    color: driverColors.surface,
    fontSize: 15,
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
