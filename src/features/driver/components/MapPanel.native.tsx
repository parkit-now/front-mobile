import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';
import type { MapPanelProps } from './MapPanel.types';

const CABA_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.4108,
  latitudeDelta: 0.13,
  longitudeDelta: 0.13,
};

export function MapPanel({
  parkingLots,
  selectedParking,
  onSelect,
  onReserve,
}: MapPanelProps) {
  return (
    <View style={styles.stage} accessibilityLabel="Mapa de estacionamientos">
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={CABA_REGION}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsCompass={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
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

      {selectedParking ? (
        <View style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <View style={styles.selectedIcon}>
              <DriverIcon name="car" size={24} color={driverColors.brand} />
            </View>
            <View style={styles.selectedCopy}>
              <Text style={styles.selectedName}>{selectedParking.name}</Text>
              <Text style={styles.selectedAddress}>
                {selectedParking.address}
              </Text>
            </View>
            <Text style={styles.rating}>{selectedParking.rating} / 5</Text>
          </View>

          <View style={styles.selectedMeta}>
            <Text style={styles.price}>{selectedParking.priceLabel}</Text>
            <Text style={styles.meta}>{selectedParking.eta}</Text>
            <Text style={styles.meta}>
              {selectedParking.availableSpots} lugares
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.reserveButton,
              !selectedParking.acceptsReservations && styles.disabledButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              onReserve(selectedParking);
            }}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !selectedParking.acceptsReservations,
            }}
            accessibilityLabel={`Reservar en ${selectedParking.name}`}
            disabled={!selectedParking.acceptsReservations}
          >
            <Text style={styles.reserveText}>
              {selectedParking.acceptsReservations
                ? 'Reservar ahora'
                : 'Sin reserva anticipada'}
            </Text>
            {selectedParking.acceptsReservations ? (
              <DriverIcon name="arrow" size={18} color={driverColors.surface} />
            ) : null}
          </Pressable>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No hay resultados en el mapa</Text>
          <Text style={styles.emptyCopy}>Probá ajustando la búsqueda.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 470,
    borderRadius: driverRadius.card,
    overflow: 'hidden',
    backgroundColor: driverColors.mapBackground,
    borderWidth: 1,
    borderColor: driverColors.border,
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
    backgroundColor: '#b54708',
  },
  availabilityDotFull: {
    backgroundColor: '#b42318',
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
  selectedCard: {
    position: 'absolute',
    left: driverSpacing.sm,
    right: driverSpacing.sm,
    bottom: driverSpacing.sm,
    padding: driverSpacing.sm,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    gap: driverSpacing.xs,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  selectedIcon: {
    width: 44,
    height: 44,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.text,
  },
  selectedAddress: {
    marginTop: 2,
    fontSize: 13,
    color: driverColors.textMuted,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.textSecondary,
  },
  selectedMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: driverSpacing.xs,
    alignItems: 'center',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.brand,
  },
  meta: {
    fontSize: 13,
    color: driverColors.textSecondary,
  },
  reserveButton: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: driverSpacing.xs,
  },
  reserveText: {
    color: driverColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: driverColors.disabled,
  },
  pressed: {
    opacity: 0.8,
  },
  emptyCard: {
    position: 'absolute',
    left: driverSpacing.md,
    right: driverSpacing.md,
    top: 180,
    padding: driverSpacing.md,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    alignItems: 'center',
  },
  emptyTitle: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCopy: {
    marginTop: 4,
    color: driverColors.textSecondary,
    fontSize: 13,
  },
});
