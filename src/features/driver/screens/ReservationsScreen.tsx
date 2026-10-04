import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutRight,
  LayoutAnimationConfig,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../../lib/notifications/ToastProvider';
import { CancelSheet } from '../components/CancelSheet';
import {
  ReservationListCard,
  ReservationTabs,
} from '../components/reservation-motion';
import {
  CARD_LINGER_MS,
  CARD_STAGGER_MS,
} from '../components/reservation-motion/timeline';
import { useDriverData } from '../hooks/useDriverData';
import type { Booking } from '../mock';
import type { DriverRootParamList } from '../navigation';
import {
  BUCKET_LABELS,
  BUCKETS,
  bucketCounts,
  bucketIndex,
  bucketMoves,
  bucketReservations,
  defaultBucket,
  reservationCardView,
  tabDirection,
  withLingering,
  type ReservationBucket,
} from '../reservationBuckets';
import { openDirections } from '../services/directions';
import {
  driverColors,
  driverLayout,
  driverRadius,
  driverSpacing,
} from '../theme';

/**
 * Animaciones de layout (entrada, salida y reacomodo de tarjetas) sólo en el
 * celular. En la web son animaciones CSS que vuelven a correr cada vez que la
 * pestaña de abajo se oculta y se muestra (display: none): se verían de nuevo.
 */
const CARD_LAYOUT_ANIMATIONS = Platform.OS !== 'web';

const EMPTY: Record<ReservationBucket, { title: string; copy: string }> = {
  pending: {
    title: 'No tenés reservas pendientes',
    copy: 'Acá ves las que falta pagar o que espera aceptar el estacionamiento.',
  },
  confirmed: {
    title: 'No tenés reservas confirmadas',
    copy: 'Buscá un estacionamiento y reservá tu lugar.',
  },
  completed: {
    title: 'Todavía no completaste reservas',
    copy: 'Acá vas a ver las reservas que ya usaste.',
  },
  cancelled: {
    title: 'No tenés reservas canceladas',
    copy: 'Acá van las canceladas, rechazadas y vencidas.',
  },
};

export function ReservationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<DriverRootParamList>>();
  const { bookings, bookingsStatus, refreshBookings } = useDriverData();
  const { showToast } = useToast();
  const reduced = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<ReservationBucket | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Reservas que cambiaron de pestaña y se quedan un momento donde estaban.
  const [lingering, setLingering] = useState<Record<string, ReservationBucket>>(
    {},
  );
  // Las tarjetas se reacomodan con resorte sólo mientras una se va de la
  // pestaña: en la web, volver a mostrar la pantalla también mueve el layout y
  // no tiene que verse como un reacomodo.
  const [moving, setMoving] = useState(false);

  // Al volver a la pestaña (por ejemplo, después de pagar o cancelar) se relee.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      void refreshBookings();
    }, [refreshBookings]),
  );

  const buckets = useMemo(
    () => bucketReservations(bookings, now),
    [bookings, now],
  );
  const shown = useMemo(
    () => withLingering(buckets, lingering),
    [buckets, lingering],
  );
  const counts = bucketCounts(shown);
  // Pendientes si hay algo esperando; si no, Confirmadas. Se elige una vez.
  const selected = tab ?? defaultBucket(counts);
  useEffect(() => {
    if (tab === null && bookingsStatus === 'success') {
      setTab(defaultBucket(bucketCounts(buckets)));
    }
  }, [tab, bookingsStatus, buckets]);

  // Una reserva cambió de pestaña después de actualizar: primero cambia en su
  // tarjeta y después se va a su pestaña nueva. Se resuelve en el mismo render
  // en que llegan los datos (no en un efecto): si no, se vería un frame sin la
  // tarjeta, con la pestaña vacía y los contadores ya cambiados.
  const [seenBuckets, setSeenBuckets] = useState(buckets);
  const [moved, setMoved] = useState<ReturnType<typeof bucketMoves>>([]);
  if (seenBuckets !== buckets) {
    setSeenBuckets(buckets);
    const moves = bucketMoves(bucketIndex(seenBuckets), buckets);
    if (moves.length > 0) {
      setMoved(moves);
      const stay = reduced
        ? []
        : moves.filter((move) => move.from === selected);
      if (stay.length > 0) {
        setMoving(true);
        setLingering((current) => {
          const next = { ...current };
          for (const move of stay) next[move.id] = move.from;
          return next;
        });
      }
    }
  }

  // Se anuncia el cambio y, pasado un momento, la tarjeta se va.
  const lingerTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => {
    if (moved.length === 0) return;
    for (const move of moved) {
      const booking = bookings.find((item) => item.id === move.id);
      if (booking && move.from === 'pending') {
        const view = reservationCardView(booking, now);
        AccessibilityInfo.announceForAccessibility(
          `${booking.parkingName}: ${view.chips[0].label}. Pasó a ${BUCKET_LABELS[move.to]}.`,
        );
      }
    }
    // No se cancela si llega otra actualización: la tarjeta se tiene que ir.
    lingerTimers.current.push(
      setTimeout(() => {
        setLingering((current) => {
          const next = { ...current };
          for (const move of moved) delete next[move.id];
          return next;
        });
      }, CARD_LINGER_MS),
      setTimeout(() => {
        setMoving(false);
      }, CARD_LINGER_MS + 1200),
    );
  }, [moved]);
  useEffect(
    () => () => {
      lingerTimers.current.forEach(clearTimeout);
    },
    [],
  );

  function selectTab(next: ReservationBucket) {
    if (next === selected) return;
    setDirection(tabDirection(selected, next));
    setLingering({});
    setTab(next);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setNow(new Date());
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

  const holdExpired = useCallback(() => {
    // La retención venció en pantalla: pasa a Canceladas y se relee.
    setNow(new Date());
    void refreshBookings();
  }, [refreshBookings]);

  const items = shown[selected];
  const loaded = bookingsStatus === 'success' || bookings.length > 0;

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + driverSpacing.lg },
        ]}
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
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Mis reservas
          </Text>
          <ReservationTabs
            tabs={BUCKETS.map((key) => ({
              key,
              label: BUCKET_LABELS[key],
              count: counts[key],
            }))}
            selected={selected}
            onSelect={selectTab}
            reduced={reduced}
            background={driverColors.background}
          />
        </View>

        {!loaded ? (
          bookingsStatus === 'error' ? (
            <ErrorState
              onRetry={() => {
                void refreshBookings();
              }}
            />
          ) : (
            <View style={styles.emptyState}>
              <ActivityIndicator color={driverColors.brand} />
              <Text style={styles.emptyCopy}>Cargando tus reservas…</Text>
            </View>
          )
        ) : (
          // Al cambiar de pestaña la lista se monta de nuevo (el escalonado
          // vuelve a correr) y las tarjetas viejas no hacen su salida.
          <LayoutAnimationConfig key={selected} skipExiting>
            <CardList
              items={items}
              direction={direction}
              reduced={reduced}
              animateLayout={moving}
              now={now}
              empty={EMPTY[selected]}
              onOpen={(booking) => {
                navigation.navigate('ReservationDetail', {
                  reservationId: booking.id,
                });
              }}
              onDirections={(booking) => {
                void handleDirections(booking);
              }}
              onCancel={setCancelTarget}
              onHoldExpired={holdExpired}
            />
          </LayoutAnimationConfig>
        )}
      </ScrollView>
      {cancelTarget ? (
        <CancelSheet
          booking={cancelTarget}
          onClose={() => {
            setCancelTarget(null);
          }}
          onCancelled={() => {
            setCancelTarget(null);
            showToast({ message: 'Reserva cancelada.', kind: 'success' });
          }}
        />
      ) : null}
    </>
  );
}

type CardListProps = {
  items: Booking[];
  direction: 1 | -1;
  reduced: boolean;
  animateLayout: boolean;
  now: Date;
  empty: { title: string; copy: string };
  onOpen: (booking: Booking) => void;
  onDirections: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onHoldExpired: () => void;
};

/**
 * Tarjetas de una pestaña. Al montarse entran escalonadas (70 ms) desde el
 * lado de la pestaña tocada; después, la que llega o se va de la pestaña entra
 * o sale sola y las demás se reacomodan con resorte.
 */
function CardList({
  items,
  direction,
  reduced,
  animateLayout,
  now,
  empty,
  onOpen,
  onDirections,
  onCancel,
  onHoldExpired,
}: CardListProps) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const animate = CARD_LAYOUT_ANIMATIONS && !reduced;

  if (items.length === 0) {
    return (
      <Animated.View
        style={styles.emptyState}
        entering={animate ? FadeInRight.duration(220) : undefined}
      >
        <Text style={styles.emptyTitle}>{empty.title}</Text>
        <Text style={styles.emptyCopy}>{empty.copy}</Text>
      </Animated.View>
    );
  }

  const enter = direction > 0 ? FadeInRight : FadeInLeft;
  return (
    <View style={styles.list}>
      {items.map((booking, index) => (
        <Animated.View
          key={booking.id}
          entering={
            animate
              ? enter
                  .delay(mounted.current ? 0 : index * CARD_STAGGER_MS)
                  .springify()
                  .damping(18)
              : undefined
          }
          exiting={animate ? FadeOutRight.duration(220) : undefined}
          layout={
            animate && animateLayout
              ? LinearTransition.springify().damping(18)
              : undefined
          }
        >
          <ReservationListCard
            booking={booking}
            view={reservationCardView(booking, now)}
            reduced={reduced}
            onOpen={onOpen}
            onDirections={onDirections}
            onCancel={onCancel}
            onHoldExpired={onHoldExpired}
          />
        </Animated.View>
      ))}
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No pudimos cargar tus reservas</Text>
      <Pressable
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: driverLayout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingBottom: driverSpacing.lg,
  },
  header: {
    gap: driverSpacing.sm,
    marginBottom: driverSpacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: driverColors.text,
    lineHeight: 34,
  },
  list: { gap: 10, paddingTop: 4 },
  emptyState: {
    marginTop: 4,
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
  pressed: {
    opacity: 0.8,
  },
});
