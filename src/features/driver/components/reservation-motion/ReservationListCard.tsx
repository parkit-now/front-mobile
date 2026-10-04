import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Booking } from '../../mock';
import {
  cardAccessibilityLabel,
  type CardChip,
  type ReservationCardView,
} from '../../reservationBuckets';
import { whenLabel } from '../../reservationMotion';
import { formatCountdown, holdRemainingSeconds } from '../../reservationStatus';
import {
  chipColors,
  driverColors,
  driverRadius,
  ticketColors,
} from '../../theme';
import { formatPlate } from '../../vehicles';
import { useSecondTick } from './ApprovalCountdown';
import { MotionIcon } from './MotionIcons';
import { SlotGlyph } from './SlotGlyph';

type Props = {
  booking: Booking;
  view: ReservationCardView;
  reduced: boolean;
  onOpen: (booking: Booking) => void;
  onDirections: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  /** Se venció la retención de una que falta pagar: hay que re-ubicarla. */
  onHoldExpired: () => void;
};

/**
 * Tarjeta de "Mis reservas" con el mismo lenguaje del ticket: lugar con el
 * autito, chips de estado y reembolso, y una nota con lo que importa ahora.
 */
export function ReservationListCard({
  booking,
  view,
  reduced,
  onOpen,
  onDirections,
  onCancel,
  onHoldExpired,
}: Props) {
  const when = whenLabel(booking);
  // Cuando la reserva cambia en pantalla, la tarjeta se marca en azul un momento.
  const highlight = useSharedValue(0);
  const glyph = useRef(view.glyph);
  useEffect(() => {
    if (glyph.current === view.glyph) return;
    glyph.current = view.glyph;
    if (reduced || view.glyph !== 'in') return;
    highlight.value = withSequence(
      withTiming(1, { duration: 270 }),
      withTiming(0, { duration: 630 }),
    );
  }, [view.glyph, reduced, highlight]);
  const cardStyle = useAnimatedStyle(() => ({
    borderColor:
      highlight.value > 0.01
        ? `rgba(14, 95, 216, ${0.15 + 0.55 * highlight.value})`
        : ticketColors.tabTrack,
  }));

  const showDirections = view.bucket === 'confirmed';
  const showActions = showDirections || view.canCancel;

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        onPress={() => {
          onOpen(booking);
        }}
        accessibilityRole="button"
        accessibilityLabel={cardAccessibilityLabel(booking, view, when)}
      >
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {booking.parkingName}
          </Text>
          <Text style={styles.amount}>{booking.priceLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.when} numberOfLines={1}>
            {when}
          </Text>
          <Text style={styles.plate}>{formatPlate(booking.vehiclePlate)}</Text>
        </View>
        <View style={styles.status}>
          <SlotGlyph variant={view.glyph} reduced={reduced} />
          <View style={styles.chips}>
            {view.chips.map((chip) => (
              <ToneChip key={chip.label} chip={chip} />
            ))}
          </View>
          {view.payAction ? (
            <View style={styles.payMini}>
              <Text style={styles.payMiniText}>
                {view.payAction === 'retry' ? 'Reintentar' : 'Pagar'}
              </Text>
            </View>
          ) : null}
        </View>
        {view.note ? (
          <View style={styles.note}>
            <MotionIcon
              name={view.note.icon}
              size={13}
              color={
                view.note.icon === 'check' ? driverColors.brand : undefined
              }
            />
            <Text style={styles.noteText} numberOfLines={2}>
              {view.note.text}
              {view.note.strong ? (
                <Text style={styles.noteStrong}> {view.note.strong}</Text>
              ) : null}
              {view.note.countdownTo ? (
                <>
                  {' '}
                  <HoldLeft
                    until={view.note.countdownTo}
                    onExpired={onHoldExpired}
                  />
                </>
              ) : null}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {showActions ? (
        <View style={styles.actions}>
          {showDirections ? (
            <Pressable
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                onDirections(booking);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Cómo llegar a ${booking.parkingName}`}
            >
              <MotionIcon name="pin" size={14} color={driverColors.brand} />
              <Text style={styles.actionText}>Cómo llegar</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {view.canCancel ? (
            <Pressable
              style={({ pressed }) => [
                styles.action,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                onCancel(booking);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar reserva</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

function HoldLeft({
  until,
  onExpired,
}: {
  until: string;
  onExpired: () => void;
}) {
  const now = useSecondTick(true);
  const seconds = holdRemainingSeconds(until, new Date(now));
  const expired = seconds <= 0;
  useEffect(() => {
    if (expired) onExpired();
  }, [expired]);
  return <Text style={styles.noteStrong}>{formatCountdown(seconds)}</Text>;
}

export function ToneChip({ chip }: { chip: CardChip }) {
  const colors = chipColors[chip.tone];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.surface },
        chip.tone === 'amber' || chip.tone === 'refund'
          ? { borderColor: colors.border, borderWidth: 1 }
          : null,
      ]}
    >
      {chip.lead === 'live' ? <View style={styles.liveDot} /> : null}
      {chip.lead === 'refund' ? (
        <MotionIcon name="refund" size={12} color={colors.text} />
      ) : null}
      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
        {chip.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: driverColors.surface,
    overflow: 'hidden',
  },
  body: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: ticketColors.ink,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
    color: ticketColors.ink,
    fontVariant: ['tabular-nums'],
  },
  when: {
    flex: 1,
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: ticketColors.meta,
    fontVariant: ['tabular-nums'],
  },
  plate: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: ticketColors.inkSoft,
    borderWidth: 1,
    borderColor: ticketColors.plateBorder,
    borderRadius: 5,
    paddingHorizontal: 5,
    lineHeight: 16,
  },
  status: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: ticketColors.cardDivider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chips: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#12b76a',
  },
  payMini: {
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: driverColors.brand,
  },
  payMiniText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  note: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: ticketColors.meta,
    fontVariant: ['tabular-nums'],
  },
  noteStrong: { fontWeight: '800', color: ticketColors.ink },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: ticketColors.cardDivider,
    paddingHorizontal: 4,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: driverRadius.chip,
  },
  actionText: { color: driverColors.brand, fontSize: 13, fontWeight: '700' },
  cancelText: { color: driverColors.danger, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
