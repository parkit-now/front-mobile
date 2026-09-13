import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingCard } from '../components/BookingCard';
import { TicketModal } from '../components/TicketModal';
import { useDriverData } from '../hooks/useDriverData';
import type { Booking, BookingStatus } from '../mock';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

const FILTERS: Array<{ id: BookingStatus; label: string }> = [
  { id: 'active', label: 'Activas' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
];

export function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const { bookings } = useDriverData();
  const [status, setStatus] = useState<BookingStatus>('active');
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const visibleBookings = useMemo(
    () => bookings.filter((booking) => booking.status === status),
    [bookings, status],
  );

  return (
    <>
      <FlatList
        data={visibleBookings}
        keyExtractor={(booking) => booking.id}
        renderItem={({ item }) => (
          <BookingCard booking={item} onViewTicket={setSelectedTicket} />
        )}
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Mis reservas</Text>
              <Text style={styles.copy}>
                Consultá tus tickets, estados y reservas anteriores.
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No hay reservas en este estado
            </Text>
            <Text style={styles.emptyCopy}>
              Cuando tengas novedades van a aparecer acá.
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + driverSpacing.lg },
        ]}
      />

      <TicketModal
        booking={selectedTicket}
        onClose={() => {
          setSelectedTicket(null);
        }}
      />
    </>
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
