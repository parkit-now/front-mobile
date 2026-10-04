import { useEffect, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { Booking } from '../../mock';
import {
  deadlineClock,
  motionHaptic,
  rejectionVariant,
  stageAnnouncement,
  whenLabel,
  type MotionState,
} from '../../reservationMotion';
import {
  clockLabel,
  formatArs,
  policyWindows,
  refundChip,
  type ReservationPhase,
} from '../../reservationStatus';
import { driverColors, driverRadius, ticketColors } from '../../theme';
import { formatPlate } from '../../vehicles';
import { ApprovalCountdown } from './ApprovalCountdown';
import { fireHaptic } from './haptics';
import { MotionIcon, type MotionIconName } from './MotionIcons';
import { ReservationTicket } from './ReservationTicket';
import { Reveal } from './Reveal';
import type { ChipState } from './StatusChip';
import { SuccessBadge, type BadgeStage } from './SuccessBadge';
import { Swap } from './Swap';
import { LEAD_MS, REDUCED_FADE_MS, T } from './timeline';

type Props = {
  booking: Booking;
  stage: BadgeStage;
  phase: ReservationPhase;
  motion: MotionState;
  focused: boolean;
  reduced: boolean;
  /** Fondo de la pantalla (las muescas del ticket lo dejan ver). */
  background: string;
  onMyReservations: () => void;
  onSearch: () => void;
  onDirections: () => void;
  onCancel: () => void;
  /** La cuenta regresiva llegó a cero: conviene preguntar ya. */
  onDeadlineReached: () => void;
};

/**
 * La reserva después de pagar: confirmada, esperando al estacionamiento o
 * rechazada. Coordina la coreografía de cada pieza (ver timeline.ts) y la
 * vibración; con "Reducir movimiento" muestra el estado final con un fundido.
 */
export function ReservationOutcome({
  booking,
  stage,
  phase,
  motion,
  focused,
  reduced,
  background,
  onMyReservations,
  onSearch,
  onDirections,
  onCancel,
  onDeadlineReached,
}: Props) {
  const { kind, key: runKey } = motion;
  const entering =
    !reduced && (kind === 'celebrate' || kind === 'payToPending');
  const swapping = !reduced && (kind === 'accept' || kind === 'reject');
  const at = kind === 'payToPending' ? T.payToPending : T.celebrate;
  const swapDelay = (accept: number, reject: number) =>
    kind === 'reject' ? reject : accept;

  // Vibración atada al guion (se cancela si la coreografía se corta).
  const hapticClock = useSharedValue(0);
  // "Reducir movimiento": un único fundido corto hacia el estado final.
  const fade = useSharedValue(reduced && kind !== 'still' ? 0 : 1);

  useEffect(() => {
    const haptic = motionHaptic(kind);
    if (kind !== 'still') {
      const text = stageAnnouncement(stage, booking);
      if (text) AccessibilityInfo.announceForAccessibility(text);
    }
    if (reduced) {
      if (kind !== 'still') {
        fade.value = 0;
        fade.value = withTiming(1, {
          duration: REDUCED_FADE_MS,
          reduceMotion: ReduceMotion.Never,
        });
      }
      if (haptic) fireHaptic(haptic);
      return;
    }
    fade.value = 1;
    if (!haptic) return;
    const momentMs =
      kind === 'accept'
        ? T.accept.haptic
        : kind === 'payToPending'
          ? T.payToPending.haptic
          : T.celebrate.haptic;
    hapticClock.value = 0;
    hapticClock.value = withDelay(
      LEAD_MS + momentMs,
      withTiming(1, { duration: 0 }, (finished) => {
        if (finished) runOnJS(fireHaptic)(haptic);
      }),
    );
    return () => {
      cancelAnimation(hapticClock);
    };
  }, [runKey]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const amount = formatArs(booking.totalArs);
  const variant = rejectionVariant(booking);
  const manual =
    booking.policy.acceptanceMode === 'manual' || stage !== 'confirmed';
  const chip: ChipState | null = !manual
    ? null
    : stage === 'pending'
      ? 'pending'
      : stage === 'rejected'
        ? variant
        : phase === 'in_progress'
          ? 'in_progress'
          : 'confirmed';
  const refund = stage === 'rejected' ? refundChip(booking, phase) : null;
  const refundTone =
    refund?.tone === 'ok'
      ? 'green'
      : refund?.tone === 'err'
        ? 'rose'
        : 'refund';
  const windows = policyWindows(booking.entryAt, booking.policy);
  const deadline = deadlineClock(booking.approvalDeadlineAt);
  const refundAmount = formatArs(booking.refundedAmountArs ?? booking.totalArs);

  const stub = stubFor(stage, phase, booking, windows, onDeadlineReached);

  return (
    <Animated.View style={fadeStyle}>
      <SuccessBadge
        stage={stage}
        kind={kind}
        runKey={runKey}
        reduced={reduced}
        approvalDeadlineAt={booking.approvalDeadlineAt}
        approvalWindowMinutes={booking.policy.approvalWindowMinutes}
      />

      <Swap
        swapKey={stage}
        animate={swapping}
        delay={swapDelay(T.accept.head, T.reject.head)}
        dy={8}
      >
        <View accessibilityRole="header">
          <Reveal
            play={entering}
            runKey={runKey}
            delay={
              kind === 'payToPending' ? T.payToPending.head : T.celebrate.title
            }
          >
            <Text style={styles.title}>
              {stage === 'pending'
                ? 'Solicitud enviada'
                : stage === 'rejected'
                  ? 'No pudimos confirmar tu reserva'
                  : phase === 'in_progress'
                    ? 'Estás estacionado'
                    : '¡Listo! Tenés tu lugar'}
            </Text>
          </Reveal>
        </View>
        <Reveal
          play={entering}
          runKey={runKey}
          delay={
            kind === 'payToPending' ? T.payToPending.head : T.celebrate.meta
          }
        >
          {stage === 'confirmed' ? (
            <View style={styles.meta}>
              <Text style={styles.place}>{booking.parkingName}</Text>
              <Text style={styles.when}>
                {whenLabel(booking)} · {formatPlate(booking.vehiclePlate)}
              </Text>
            </View>
          ) : (
            <Text style={styles.sub}>
              {stage === 'pending'
                ? `Pagaste ${amount}. Falta que ${booking.parkingName} confirme tu lugar.`
                : booking.refundStatus === 'refunded' ||
                    booking.refundStatus === 'partial'
                  ? `Te devolvimos ${refundAmount} a tu Mercado Pago.`
                  : booking.refundStatus === 'failed'
                    ? `Tuvimos un problema al devolverte ${refundAmount}. El estacionamiento lo va a reintentar.`
                    : `Te devolvemos ${refundAmount} a tu Mercado Pago.`}
            </Text>
          )}
        </Reveal>
      </Swap>

      <ReservationTicket
        stage={stage}
        kind={kind}
        runKey={runKey}
        reduced={reduced}
        focused={focused}
        code={booking.ticketCode}
        chip={chip}
        amountLabel={amount}
        refund={refund ? { label: refund.label, tone: refundTone } : null}
        stub={stub}
        notchColor={background}
      />

      <Swap
        swapKey={`${stage}-${variant}`}
        animate={swapping}
        delay={swapDelay(T.accept.info, T.reject.rows)}
        dy={6}
        style={styles.info}
      >
        <View style={styles.stack}>
          {infoRows(stage, phase, booking, variant, windows, deadline).map(
            (row, index) => (
              <Reveal
                key={row.key}
                play={entering}
                runKey={runKey}
                delay={
                  kind === 'payToPending'
                    ? T.payToPending.info + index * 80
                    : T.celebrate.info
                }
              >
                <View style={styles.infoRow}>
                  <MotionIcon name={row.icon} color={row.color} />
                  <Text style={styles.infoText}>{row.text}</Text>
                </View>
              </Reveal>
            ),
          )}
        </View>
      </Swap>

      <Reveal play={entering} runKey={runKey} delay={at.cta} dy={8}>
        <Swap
          swapKey={stage}
          animate={swapping}
          delay={swapDelay(T.accept.cta, T.reject.cta)}
          dy={6}
          style={styles.actions}
        >
          {stage === 'rejected' ? (
            <View style={styles.stackActions}>
              <OutcomeButton label="Buscar otro lugar" onPress={onSearch} />
              <OutcomeButton
                label="Ver mis reservas"
                onPress={onMyReservations}
                variant="secondary"
              />
            </View>
          ) : (
            <View style={styles.stackActions}>
              <OutcomeButton
                label="Ver mis reservas"
                onPress={onMyReservations}
              />
              {stage === 'confirmed' ? (
                <OutcomeButton
                  label="Cómo llegar"
                  onPress={onDirections}
                  variant="secondary"
                />
              ) : null}
              {booking.cancellable ? (
                <OutcomeButton
                  label={
                    stage === 'pending'
                      ? 'Cancelar (reembolso total)'
                      : 'Cancelar reserva'
                  }
                  onPress={onCancel}
                  variant="ghost"
                />
              ) : null}
            </View>
          )}
        </Swap>
      </Reveal>
    </Animated.View>
  );
}

function stubFor(
  stage: BadgeStage,
  phase: ReservationPhase,
  booking: Booking,
  windows: ReturnType<typeof policyWindows>,
  onDeadlineReached: () => void,
): { key: string; node: ReactNode } {
  if (stage === 'pending') {
    return {
      key: 'pending',
      node: (
        <ApprovalCountdown
          approvalDeadlineAt={booking.approvalDeadlineAt}
          onReachZero={onDeadlineReached}
        />
      ),
    };
  }
  if (stage === 'rejected') {
    return {
      key: 'rejected',
      node: <StubText title="Lugar sin asignar" caption="Te devolvemos todo" />,
    };
  }
  if (phase === 'in_progress') {
    return {
      key: 'in_progress',
      node: (
        <StubText
          title="Estás adentro"
          caption={`Salís a las ${booking.exit.timeLabel}`}
        />
      ),
    };
  }
  const freeCancel = windows.freeCancelUntil.getTime() > Date.now();
  return {
    key: freeCancel ? 'free-cancel' : 'enter-from',
    node: freeCancel ? (
      <StubText
        title="Cancelación gratis"
        caption={`hasta las ${clockLabel(windows.freeCancelUntil)}`}
      />
    ) : (
      <StubText
        title="Podés entrar"
        caption={`desde las ${clockLabel(windows.enterFrom)}`}
      />
    ),
  };
}

type InfoRow = {
  key: string;
  icon: MotionIconName;
  color?: string;
  text: ReactNode;
};

function infoRows(
  stage: BadgeStage,
  phase: ReservationPhase,
  booking: Booking,
  variant: 'rejected' | 'no_response',
  windows: ReturnType<typeof policyWindows>,
  deadline: string | null,
): InfoRow[] {
  if (stage === 'pending') {
    return [
      {
        key: 'deadline',
        icon: 'bell',
        text: deadline ? (
          <>
            Responde antes de las <Text style={styles.strong}>{deadline}</Text>.
            Te avisamos apenas conteste.
          </>
        ) : (
          'Te avisamos apenas conteste.'
        ),
      },
      {
        key: 'guarantee',
        icon: 'shield',
        color: driverColors.success,
        text: 'Si no confirma a tiempo, te devolvemos todo.',
      },
    ];
  }
  if (stage === 'confirmed') {
    return [
      {
        key: 'code',
        icon: 'qr',
        color: driverColors.brand,
        text: 'Mostrá el código al llegar a la entrada.',
      },
      phase === 'in_progress'
        ? {
            key: 'exit',
            icon: 'clock',
            text: `Tu reserva termina a las ${booking.exit.timeLabel}.`,
          }
        : {
            key: 'enter',
            icon: 'clock',
            text: `Podés entrar desde las ${clockLabel(windows.enterFrom)} y tenés tolerancia hasta las ${clockLabel(windows.graceUntil)}.`,
          },
    ];
  }
  const late: InfoRow = {
    key: 'late',
    icon: 'card',
    text: 'Puede tardar unos días en verse.',
  };
  if (variant === 'no_response') {
    return [
      {
        key: 'timeout',
        icon: 'clock',
        text: (
          <>
            <Text style={styles.strong}>No respondió a tiempo.</Text>
            {deadline ? ` El plazo venció a las ${deadline}.` : ''}
          </>
        ),
      },
      late,
    ];
  }
  const ownerReason =
    booking.reason && booking.cancelledBy === 'owner' ? booking.reason : null;
  return [
    {
      key: 'reason',
      icon: 'message',
      text: ownerReason ? (
        <>
          <Text style={styles.strong}>Motivo:</Text> {ownerReason}
        </>
      ) : (
        `${booking.parkingName} no pudo aceptar tu reserva.`
      ),
    },
    late,
  ];
}

function StubText({ title, caption }: { title: string; caption: string }) {
  return (
    <View accessible accessibilityLabel={`${title} ${caption}`}>
      <Text style={styles.stubTitle}>{title}</Text>
      <Text style={styles.stubCaption}>{caption}</Text>
    </View>
  );
}

function OutcomeButton({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        variant === 'primary'
          ? styles.primary
          : variant === 'secondary'
            ? styles.secondary
            : styles.ghost,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text
        style={
          variant === 'primary'
            ? styles.primaryText
            : variant === 'secondary'
              ? styles.secondaryText
              : styles.ghostText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 4,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    color: ticketColors.ink,
  },
  meta: { marginTop: 6, alignItems: 'center' },
  place: {
    fontSize: 15,
    fontWeight: '700',
    color: ticketColors.ink,
    textAlign: 'center',
  },
  when: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '600',
    color: ticketColors.meta,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  sub: {
    marginTop: 5,
    alignSelf: 'center',
    maxWidth: 300,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '600',
    color: ticketColors.meta,
    textAlign: 'center',
  },
  info: { marginTop: 14, paddingHorizontal: 4 },
  stack: { gap: 8 },
  stackActions: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: ticketColors.meta,
  },
  strong: { fontWeight: '800', color: ticketColors.ink },
  stubTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: ticketColors.ink,
    letterSpacing: -0.1,
  },
  stubCaption: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: ticketColors.label,
  },
  actions: { marginTop: 20 },
  primary: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondary: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.brand,
    backgroundColor: driverColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: driverColors.brand, fontSize: 15, fontWeight: '700' },
  ghost: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: driverColors.danger, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
