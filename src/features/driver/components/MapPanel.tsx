import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ParkingLot } from '../mock';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

type Props = {
  parkingLots: ParkingLot[];
  selectedParking: ParkingLot | undefined;
  onSelect: (parking: ParkingLot) => void;
  onReserve: (parking: ParkingLot) => void;
};

export function MapPanel({
  parkingLots,
  selectedParking,
  onSelect,
  onReserve,
}: Props) {
  return (
    <View style={styles.stage} accessibilityLabel="Mapa de estacionamientos">
      <MapSurface />

      {parkingLots.map((parking) => {
        const selected = parking.id === selectedParking?.id;
        return (
          <Pressable
            key={parking.id}
            style={[
              styles.pin,
              selected && styles.pinSelected,
              {
                left: parking.mapPosition.left,
                top: parking.mapPosition.top,
              },
            ]}
            onPress={() => {
              onSelect(parking);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${parking.name}, ${parking.availableSpots} lugares disponibles`}
          >
            <View style={styles.pinDot} />
          </Pressable>
        );
      })}

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

function MapSurface() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 500"
      accessible={false}
      focusable={false}
    >
      <Rect width="360" height="500" fill={driverColors.mapBackground} />
      <Path
        d="M-30 88 C82 54 156 68 390 10"
        stroke={driverColors.mapRoad}
        strokeWidth="28"
      />
      <Path
        d="M-20 236 C90 205 171 217 388 148"
        stroke={driverColors.mapRoad}
        strokeWidth="24"
      />
      <Path
        d="M16 425 C116 346 213 355 382 300"
        stroke={driverColors.mapRoad}
        strokeWidth="24"
      />
      <Path
        d="M214 -30 C188 92 159 206 113 530"
        stroke={driverColors.mapRoad}
        strokeWidth="27"
      />
      <Path
        d="M310 -12 C252 76 246 190 248 534"
        stroke={driverColors.mapRoadSecondary}
        strokeWidth="15"
      />
      <Rect
        x="28"
        y="120"
        width="82"
        height="58"
        rx="14"
        fill={driverColors.mapRoadSecondary}
        stroke={driverColors.border}
      />
      <Rect
        x="206"
        y="83"
        width="92"
        height="70"
        rx="14"
        fill={driverColors.mapBlockWarm}
      />
      <Rect
        x="188"
        y="332"
        width="78"
        height="68"
        rx="14"
        fill={driverColors.mapBlockGreen}
      />
      <Rect
        x="54"
        y="303"
        width="96"
        height="68"
        rx="14"
        fill={driverColors.mapRoadSecondary}
        stroke={driverColors.border}
      />
      <Circle
        cx="80"
        cy="220"
        r="34"
        fill={driverColors.mapWater}
        opacity="0.7"
      />
      <Path
        d="M-20 363 C42 390 91 394 157 369"
        stroke={driverColors.mapWaterStrong}
        strokeWidth="18"
        opacity="0.7"
      />
    </Svg>
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
  pin: {
    position: 'absolute',
    width: 36,
    height: 36,
    marginLeft: -18,
    marginTop: -18,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: driverColors.surface,
  },
  pinSelected: {
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    backgroundColor: driverColors.brandStrong,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: driverColors.surface,
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
