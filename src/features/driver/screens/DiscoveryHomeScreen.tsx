import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { DriverIcon } from '../components/DriverIcon';
import {
  CURRENT_LOCATION_DESTINATION,
  RECENT_DESTINATIONS,
  type SearchDestination,
} from '../discovery';
import type { DiscoveryStackParamList } from '../navigation';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

type Props = NativeStackScreenProps<DiscoveryStackParamList, 'DiscoveryHome'>;

export function DiscoveryHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  function openMap(destination: SearchDestination) {
    navigation.navigate('MapResults', { destination });
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + driverSpacing.sm },
      ]}
    >
      <View style={styles.topBar}>
        <View style={styles.brand} accessibilityLabel="Parkit">
          <View style={styles.logo}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.brandText}>PARKIT</Text>
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
            navigation.navigate('DestinationSearch');
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
            pressed && styles.pressed,
          ]}
          onPress={() => {
            openMap(CURRENT_LOCATION_DESTINATION);
          }}
          accessibilityRole="button"
          accessibilityLabel="Estacionar cerca mío"
        >
          <DriverIcon name="current-location" size={20} />
          <Text style={styles.nearbyText}>Estacionar cerca mío</Text>
        </Pressable>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionLabel}>DESTINOS RECIENTES</Text>
        <View style={styles.recentList}>
          {RECENT_DESTINATIONS.map((destination, index) => (
            <Pressable
              key={destination.id}
              style={({ pressed }) => [
                styles.recentRow,
                index < RECENT_DESTINATIONS.length - 1 && styles.recentBorder,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                openMap(destination);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${destination.name}, ${destination.address}`}
            >
              <View style={styles.recentIcon}>
                <DriverIcon name="clock" size={18} color={driverColors.brand} />
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

      <Text style={styles.networkCopy}>
        Mostramos sólo cocheras operadas por Parkit.
      </Text>
    </ScrollView>
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
    width: 32,
    height: 32,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: driverColors.surface,
    fontSize: 16,
    fontWeight: '700',
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
  networkCopy: {
    marginTop: 'auto',
    color: driverColors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
});
