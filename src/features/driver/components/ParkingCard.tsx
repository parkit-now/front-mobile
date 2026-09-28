import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParkingLot } from '../mock';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

type Props = {
  parking: ParkingLot;
  selected: boolean;
  onPress: () => void;
};

export function ParkingCard({ parking, selected, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${parking.name}, ${parking.address}, ${parking.priceLabel}, ${parking.availableSpots} lugares disponibles`}
      accessibilityHint="Selecciona este estacionamiento en el mapa"
    >
      <View style={styles.thumbnail}>
        <DriverIcon name="car" size={32} color={driverColors.brand} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{parking.name}</Text>
          <Text style={styles.rating}>{parking.rating} / 5</Text>
        </View>
        <Text style={styles.address}>{parking.address}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>{parking.priceLabel}</Text>
          <Text style={styles.meta}>{parking.eta}</Text>
          <Text style={styles.meta}>{parking.distance}</Text>
          <Text style={styles.meta}>{parking.availableSpots} lugares</Text>
        </View>
        <Text style={styles.open}>{parking.openUntil}</Text>
        <View style={styles.serviceRow}>
          {parking.services.slice(0, 2).map((service) => (
            <View key={service} style={styles.serviceChip}>
              <Text style={styles.serviceText}>{service}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 146,
    padding: driverSpacing.sm,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    gap: driverSpacing.sm,
  },
  cardSelected: {
    borderColor: driverColors.brand,
    borderWidth: 2,
  },
  cardPressed: {
    opacity: 0.8,
  },
  thumbnail: {
    width: 88,
    minHeight: 120,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: driverSpacing.xs,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: '700',
    color: driverColors.text,
    lineHeight: 22,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.textSecondary,
  },
  address: {
    fontSize: 13,
    color: driverColors.textMuted,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: driverSpacing.xs,
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
  open: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.success,
  },
  serviceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  serviceChip: {
    paddingHorizontal: driverSpacing.xs,
    paddingVertical: 4,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
  },
  serviceText: {
    color: driverColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
