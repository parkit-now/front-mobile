import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logo from '../../../../images/logo.jpeg';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { DriverIcon } from '../components/DriverIcon';
import { LocationIssueModal } from '../components/LocationIssueModal';
import { DEFAULT_DISCOVERY_CENTER, type SearchDestination } from '../discovery';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useDriverData } from '../hooks/useDriverData';
import { useNearbyParkings } from '../hooks/useNearbyParkings';
import { useRecentDestinations } from '../hooks/useRecentDestinations';
import { useStartLocation } from '../hooks/useStartLocation';
import type { ParkingLot } from '../mock';
import type { DiscoveryStackParamList } from '../navigation';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'DiscoveryHome'>;

const MAX_HOME_PARKINGS = 3;

export function DiscoveryHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const currentLocation = useCurrentLocation();
  const { recents, remember } = useRecentDestinations();
  const startLocation = useStartLocation();

  function openMap(destination: SearchDestination) {
    remember(destination);
    navigation.navigate('MapResults', { destination });
  }

  async function openCurrentLocation() {
    const destination = await currentLocation.request();
    if (destination) openMap(destination);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + driverSpacing.sm },
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.brand} accessibilityLabel="Parkit">
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.brandText}>Parkit</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              showToast({
                message: 'No tenés notificaciones nuevas.',
                kind: 'info',
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <DriverIcon name="bell" size={19} />
          </Pressable>
        </View>

        <View style={styles.searchSection}>
          <Text style={styles.title}>¿A dónde vas?</Text>
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              navigation.navigate('MapResults');
            }}
            accessibilityRole="button"
            accessibilityLabel="Buscar destino"
          >
            <DriverIcon name="search" color={driverColors.brand} size={20} />
            <Text style={styles.searchPlaceholder}>
              Dirección, lugar o esquina
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.nearbyButton,
              currentLocation.pending && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void openCurrentLocation();
            }}
            disabled={currentLocation.pending}
            accessibilityRole="button"
            accessibilityLabel="Estacionar cerca mío"
            accessibilityState={{
              disabled: currentLocation.pending,
              busy: currentLocation.pending,
            }}
          >
            <DriverIcon name="current-location" size={20} />
            <Text style={styles.nearbyText}>
              {currentLocation.pending
                ? 'Buscando ubicación…'
                : 'Estacionar cerca mío'}
            </Text>
          </Pressable>
        </View>

        {recents.length > 0 ? (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>DESTINOS RECIENTES</Text>
            <View style={styles.recentList}>
              {recents.map((destination, index) => (
                <Pressable
                  key={destination.id}
                  style={({ pressed }) => [
                    styles.recentRow,
                    index < recents.length - 1 && styles.recentBorder,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    openMap(destination);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${destination.name}, ${destination.address}`}
                >
                  <View style={styles.recentIcon}>
                    <DriverIcon
                      name="clock"
                      size={18}
                      color={driverColors.brand}
                    />
                  </View>
                  <View style={styles.recentCopy}>
                    <Text style={styles.recentName}>{destination.name}</Text>
                    <Text style={styles.recentAddress} numberOfLines={1}>
                      {destination.address}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {startLocation.checked ? (
          <HomeParkings
            nearUser={startLocation.location !== null}
            center={
              startLocation.location?.coordinate ?? DEFAULT_DISCOVERY_CENTER
            }
            onOpen={(parking) => {
              navigation.navigate('ParkingDetails', { parking });
            }}
          />
        ) : null}

        <Text style={styles.networkCopy}>
          Mostramos sólo cocheras operadas por Parkit.
        </Text>
      </ScrollView>
      <LocationIssueModal
        issue={currentLocation.issue}
        pending={currentLocation.pending}
        onClose={currentLocation.clearIssue}
        onRetry={() => {
          void openCurrentLocation();
        }}
      />
    </>
  );
}

type HomeParkingsProps = {
  /** Si el centro es la ubicación del conductor (y no el centro de CABA). */
  nearUser: boolean;
  center: { latitude: number; longitude: number };
  onOpen: (parking: ParkingLot) => void;
};

// Cocheras para elegir sin buscar. Si falla o no hay ninguna, la sección no se
// muestra: el buscador sigue siendo el camino principal.
function HomeParkings({ nearUser, center, onOpen }: HomeParkingsProps) {
  const { accessToken } = useDriverData();
  const nearby = useNearbyParkings(center, accessToken);
  const parkings = nearby.parkings.slice(0, MAX_HOME_PARKINGS);

  if (nearby.status !== 'success' || parkings.length === 0) return null;

  return (
    <View style={styles.recentSection}>
      <Text style={styles.sectionLabel}>
        {nearUser ? 'COCHERAS CERCA TUYO' : 'COCHERAS PARKIT'}
      </Text>
      <View style={styles.recentList}>
        {parkings.map((parking, index) => (
          <Pressable
            key={parking.id}
            style={({ pressed }) => [
              styles.recentRow,
              index < parkings.length - 1 && styles.recentBorder,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              onOpen(parking);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${parking.name}, ${parking.address}, ${parking.priceLabel}`}
          >
            <View style={styles.recentIcon}>
              <DriverIcon name="car" size={18} color={driverColors.brand} />
            </View>
            <View style={styles.recentCopy}>
              <Text style={styles.recentName} numberOfLines={1}>
                {parking.name}
              </Text>
              <Text style={styles.recentAddress} numberOfLines={1}>
                {/* La distancia se mide desde el centro de la búsqueda: sólo
                    tiene sentido mostrarla si ese centro es el conductor. */}
                {nearUser
                  ? `${parking.distance} · ${parking.address}`
                  : parking.address}
              </Text>
            </View>
            <Text style={styles.parkingPrice}>{parking.priceLabel}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingBottom: driverSpacing.lg,
    backgroundColor: driverColors.background,
    gap: driverSpacing.lg,
  },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: driverColors.border,
  },
  brandText: {
    color: driverColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    gap: driverSpacing.sm,
  },
  title: {
    color: driverColors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  searchButton: {
    minHeight: 56,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    color: driverColors.textMuted,
    fontSize: 16,
  },
  nearbyButton: {
    minHeight: 48,
    paddingHorizontal: driverSpacing.md,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  nearbyText: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  recentSection: {
    gap: driverSpacing.xs,
  },
  sectionLabel: {
    color: driverColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  recentList: {
    overflow: 'hidden',
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
  },
  recentRow: {
    minHeight: 68,
    paddingHorizontal: driverSpacing.md,
    paddingVertical: driverSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  recentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: driverColors.border,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recentName: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  recentAddress: {
    color: driverColors.textSecondary,
    fontSize: 13,
  },
  parkingPrice: {
    color: driverColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  networkCopy: {
    marginTop: 'auto',
    color: driverColors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.62,
  },
});
