import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DriverIcon } from '../components/DriverIcon';
import { MapPanel } from '../components/MapPanel';
import { ReservationModal } from '../components/ReservationModal';
import { useDriverData } from '../hooks/useDriverData';
import { PARKING_LOTS, type ParkingLot } from '../mock';
import type { DiscoveryStackParamList } from '../navigation';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'MapResults'>;

export function MapResultsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { createReservation } = useDriverData();
  const [selectedParkingId, setSelectedParkingId] = useState(
    PARKING_LOTS[0]?.id,
  );
  const [reservationParking, setReservationParking] =
    useState<ParkingLot | null>(null);
  const parkingLots = useMemo(() => PARKING_LOTS, []);
  const selectedParking =
    parkingLots.find((parking) => parking.id === selectedParkingId) ??
    parkingLots[0];

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + driverSpacing.sm },
        ]}
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
              navigation.navigate('DestinationSearch');
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

        <View style={styles.filters}>
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>Auto</Text>
          </View>
          <View style={styles.filter}>
            <View style={styles.availableDot} />
            <Text style={styles.filterText}>Disponible ahora</Text>
          </View>
          <View style={styles.filter}>
            <Text style={styles.filterText}>Precio</Text>
          </View>
        </View>

        <MapPanel
          parkingLots={parkingLots}
          selectedParking={selectedParking}
          onSelect={(parking) => {
            setSelectedParkingId(parking.id);
          }}
          onReserve={setReservationParking}
        />
      </ScrollView>

      <ReservationModal
        parking={reservationParking}
        onCancel={() => {
          setReservationParking(null);
        }}
        onConfirm={(parking) => {
          createReservation(parking);
          setReservationParking(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: driverColors.background,
  },
  content: {
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingBottom: driverSpacing.lg,
    gap: driverSpacing.sm,
  },
  destinationBar: {
    minHeight: 56,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
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
  filters: {
    flexDirection: 'row',
    gap: driverSpacing.xs,
  },
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
  filterText: {
    color: driverColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: driverColors.success,
  },
  pressed: {
    opacity: 0.75,
  },
});
