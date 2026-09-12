import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { DriverIcon } from '../components/DriverIcon';
import { MapPanel } from '../components/MapPanel';
import { ParkingCard } from '../components/ParkingCard';
import { ReservationModal } from '../components/ReservationModal';
import { useDriverData } from '../hooks/useDriverData';
import {
  PARKING_LOTS,
  VEHICLE_KINDS,
  type ParkingLot,
  type VehicleKind,
} from '../mock';
import type { DriverTabParamList } from '../navigation';
import { filterParkingLots } from '../selectors';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = BottomTabScreenProps<DriverTabParamList, 'Explore'>;

export function ExploreScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { createReservation } = useDriverData();
  const [query, setQuery] = useState('');
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>('Auto');
  const [reservationsOnly, setReservationsOnly] = useState(false);
  const [selectedParkingId, setSelectedParkingId] = useState(
    PARKING_LOTS[0].id,
  );
  const [reservationParking, setReservationParking] =
    useState<ParkingLot | null>(null);

  const parkingLots = useMemo(
    () =>
      filterParkingLots(PARKING_LOTS, {
        query,
        vehicleKind,
        reservationsOnly,
      }),
    [query, reservationsOnly, vehicleKind],
  );
  const selectedParking =
    parkingLots.find((parking) => parking.id === selectedParkingId) ??
    parkingLots[0];

  function confirmReservation(parking: ParkingLot) {
    const booking = createReservation(parking);
    setReservationParking(null);
    showToast({
      message: `Reserva ${booking.ticketCode} confirmada.`,
      kind: 'success',
    });
    navigation.navigate('Reservations');
  }

  return (
    <>
      <FlatList
        data={parkingLots}
        keyExtractor={(parking) => parking.id}
        renderItem={({ item }) => (
          <ParkingCard
            parking={item}
            selected={item.id === selectedParking?.id}
            onPress={() => {
              setSelectedParkingId(item.id);
            }}
          />
        )}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          <ExploreHeader
            query={query}
            vehicleKind={vehicleKind}
            reservationsOnly={reservationsOnly}
            parkingLots={parkingLots}
            selectedParking={selectedParking}
            onChangeQuery={setQuery}
            onChangeVehicle={setVehicleKind}
            onToggleReservations={() => {
              setReservationsOnly((current) => !current);
            }}
            onSelectParking={(parking) => {
              setSelectedParkingId(parking.id);
            }}
            onReserve={setReservationParking}
            onOpenNotifications={() => {
              showToast({
                message: 'No tenés notificaciones nuevas.',
                kind: 'info',
              });
            }}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + driverSpacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No encontramos estacionamientos
            </Text>
            <Text style={styles.emptyCopy}>
              Probá con otra zona, vehículo o quitá algún filtro.
            </Text>
          </View>
        }
      />
      <ReservationModal
        parking={reservationParking}
        onCancel={() => {
          setReservationParking(null);
        }}
        onConfirm={confirmReservation}
      />
    </>
  );
}

type HeaderProps = {
  query: string;
  vehicleKind: VehicleKind;
  reservationsOnly: boolean;
  parkingLots: ParkingLot[];
  selectedParking: ParkingLot | undefined;
  onChangeQuery: (query: string) => void;
  onChangeVehicle: (vehicle: VehicleKind) => void;
  onToggleReservations: () => void;
  onSelectParking: (parking: ParkingLot) => void;
  onReserve: (parking: ParkingLot) => void;
  onOpenNotifications: () => void;
};

function ExploreHeader({
  query,
  vehicleKind,
  reservationsOnly,
  parkingLots,
  selectedParking,
  onChangeQuery,
  onChangeVehicle,
  onToggleReservations,
  onSelectParking,
  onReserve,
  onOpenNotifications,
}: HeaderProps) {
  return (
    <View style={styles.headerStack}>
      <View style={styles.topBar}>
        <View style={styles.avatar} accessible accessibilityLabel="Parkit">
          <Text style={styles.avatarText}>P</Text>
        </View>
        <View style={styles.locationPill}>
          <DriverIcon name="pin" size={18} color={driverColors.brand} />
          <Text style={styles.locationText}>Buenos Aires</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.roundAction,
            pressed && styles.pressed,
          ]}
          onPress={onOpenNotifications}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
        >
          <DriverIcon
            name="bell"
            size={20}
            color={driverColors.textSecondary}
          />
        </Pressable>
      </View>

      <View>
        <Text style={styles.kicker}>Reserva rápida</Text>
        <Text style={styles.title}>¿Dónde estacionás hoy?</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.vehicleList}
        accessibilityRole="radiogroup"
      >
        {VEHICLE_KINDS.map((kind) => {
          const selected = kind === vehicleKind;
          return (
            <Pressable
              key={kind}
              style={({ pressed }) => [
                styles.vehicleChip,
                selected && styles.vehicleChipActive,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                onChangeVehicle(kind);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={kind}
            >
              <DriverIcon
                name="car"
                size={22}
                color={
                  selected ? driverColors.surface : driverColors.textSecondary
                }
              />
              <Text
                style={[
                  styles.vehicleText,
                  selected && styles.vehicleTextActive,
                ]}
              >
                {kind}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.timeRow}>
        <TimeValue label="Entrada" value="Hoy 18:30" />
        <TimeValue label="Estadía" value="2 horas" />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <DriverIcon name="search" size={20} color={driverColors.disabled} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Destino, calle o servicio"
            placeholderTextColor={driverColors.disabled}
            autoCapitalize="words"
            returnKeyType="search"
            accessibilityLabel="Buscar estacionamientos"
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            reservationsOnly && styles.filterButtonActive,
            pressed && styles.pressed,
          ]}
          onPress={onToggleReservations}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: reservationsOnly }}
          accessibilityLabel="Sólo con reserva anticipada"
        >
          <DriverIcon
            name="filter"
            size={21}
            color={reservationsOnly ? driverColors.surface : driverColors.brand}
          />
        </Pressable>
      </View>

      <MapPanel
        parkingLots={parkingLots}
        selectedParking={selectedParking}
        onSelect={onSelectParking}
        onReserve={onReserve}
      />

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Cerca tuyo</Text>
        <Text style={styles.resultsCount}>
          {parkingLots.length}{' '}
          {parkingLots.length === 1 ? 'resultado' : 'resultados'}
        </Text>
      </View>
    </View>
  );
}

function TimeValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value}</Text>
    </View>
  );
}

function ListSeparator() {
  return <View style={styles.listSeparator} />;
}

const styles = StyleSheet.create({
  listContent: {
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingBottom: driverSpacing.lg,
  },
  headerStack: {
    gap: driverSpacing.md,
    marginBottom: driverSpacing.sm,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: driverSpacing.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: driverColors.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  locationPill: {
    flex: 1,
    minHeight: 44,
    maxWidth: 280,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: driverSpacing.xs,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: driverColors.text,
  },
  roundAction: {
    width: 46,
    height: 46,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 14,
    fontWeight: '600',
    color: driverColors.brand,
  },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '700',
    color: driverColors.text,
    lineHeight: 34,
  },
  vehicleList: {
    gap: driverSpacing.xs,
    paddingRight: driverSpacing.md,
  },
  vehicleChip: {
    minWidth: 98,
    minHeight: 64,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    justifyContent: 'center',
    gap: driverSpacing.xs,
  },
  vehicleChipActive: {
    backgroundColor: driverColors.brand,
    borderColor: driverColors.brandStrong,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.textSecondary,
  },
  vehicleTextActive: {
    color: driverColors.surface,
  },
  timeRow: {
    flexDirection: 'row',
    gap: driverSpacing.xs,
  },
  timeBox: {
    flex: 1,
    minHeight: 58,
    paddingHorizontal: driverSpacing.sm,
    paddingVertical: driverSpacing.xs,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: driverColors.textMuted,
  },
  timeValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '700',
    color: driverColors.text,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: driverColors.text,
    fontSize: 15,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: driverColors.brand,
    borderColor: driverColors.brandStrong,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: driverSpacing.sm,
    marginTop: driverSpacing.xs,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: driverColors.text,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: driverColors.textSecondary,
  },
  emptyState: {
    marginTop: driverSpacing.md,
    padding: driverSpacing.lg,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.text,
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: driverSpacing.xs,
    fontSize: 14,
    color: driverColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listSeparator: {
    height: driverSpacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
