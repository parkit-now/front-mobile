import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { BookingCard } from '../components/BookingCard';
import { useDriverData } from '../hooks/useDriverData';
import type { Booking, BookingStatus } from '../mock';
import { openDirections } from '../services/directions';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

const FILTERS: Array<{ id: BookingStatus; label: string }> = [
  { id: 'active', label: 'Activas' },
  { id: 'completed', label: 'Completadas' },
];

export function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const { bookings, bookingsStatus, refreshBookings } = useDriverData();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<BookingStatus>('active');
  const { showToast } = useToast();
  const visibleBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === status)
        // Activas: la más próxima primero. Completadas: la más reciente.
        .sort((left, right) =>
          status === 'active'
            ? left.entryAt.localeCompare(right.entryAt)
            : right.entryAt.localeCompare(left.entryAt),
        ),
    [bookings, status],
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refreshBookings();
    setRefreshing(false);
  }

  async function handleDirections(booking: Booking) {
    const opened = await openDirections(booking.coordinate);
    if (!opened) {
      showToast({
        message: 'No pudimos abrir la aplicación de mapas.',
        kind: 'error',
      });
    }
  }

  return (
    <FlatList
      data={visibleBookings}
      keyExtractor={(booking) => booking.id}
      renderItem={({ item }) => (
        <BookingCard
          booking={item}
          onDirections={(booking) => {
            void handleDirections(booking);
          }}
        />
      )}
      ItemSeparatorComponent={ListSeparator}
      ListHeaderComponent={
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mis reservas</Text>
            <Text style={styles.copy}>
              Consultá tus reservas activas y anteriores.
            </Text>
          </View>

          <View style={styles.segmented} accessibilityRole="tablist">
            {FILTERS.map((filter) => {
              const selected = filter.id === status;
              return (
                <Pressable
                  key={filter.id}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && styles.segmentActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setStatus(filter.id);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void handleRefresh();
          }}
          tintColor={driverColors.brand}
          colors={[driverColors.brand]}
        />
      }
      ListEmptyComponent={
        bookingsStatus === 'loading' ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={driverColors.brand} />
            <Text style={styles.emptyCopy}>Cargando tus reservas…</Text>
          </View>
        ) : bookingsStatus === 'error' ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No pudimos cargar tus reservas
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                void refreshBookings();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {status === 'active'
                ? 'No tenés reservas activas'
                : 'Todavía no tenés reservas completadas'}
            </Text>
            <Text style={styles.emptyCopy}>
              {status === 'active'
                ? 'Buscá una cochera y reservá tu lugar.'
                : 'Acá vas a ver las reservas que ya terminaron.'}
            </Text>
          </View>
        )
      }
      contentContainerStyle={[
        styles.listContent,
        { paddingTop: insets.top + driverSpacing.lg },
      ]}
    />
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  listContent: {
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingBottom: driverSpacing.lg,
  },
  header: {
    gap: driverSpacing.md,
    marginBottom: driverSpacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: driverColors.text,
    lineHeight: 34,
  },
  copy: {
    marginTop: 4,
    fontSize: 14,
    color: driverColors.textSecondary,
    lineHeight: 20,
  },
  segmented: {
    minHeight: 52,
    padding: 5,
    borderRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    borderRadius: driverRadius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: driverColors.brand,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: driverColors.textSecondary,
  },
  segmentTextActive: {
    color: driverColors.surface,
  },
  emptyState: {
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
  retryButton: {
    minHeight: 44,
    marginTop: driverSpacing.xs,
    justifyContent: 'center',
  },
  retryText: {
    color: driverColors.brand,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCopy: {
    marginTop: driverSpacing.xs,
    fontSize: 14,
    color: driverColors.textSecondary,
    textAlign: 'center',
  },
  separator: {
    height: driverSpacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
