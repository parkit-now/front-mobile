import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { MotionKind } from '../../reservationMotion';
import { chipColors, driverColors, ticketColors } from '../../theme';
import { MotionIcon } from './MotionIcons';
import { ParkingSlotCar, type SlotStage } from './ParkingSlotCar';
import { Reveal } from './Reveal';
import { StatusChip, type ChipState } from './StatusChip';
import { Swap } from './Swap';
import {
  CODE_STAGGER_MS,
  LEAD_MS,
  PERFORATION_STAGGER_MS,
  SPRING,
  T,
} from './timeline';

type Props = {
  stage: SlotStage;
  kind: MotionKind;
  runKey: number;
  reduced: boolean;
  focused: boolean;
  code: string;
  /** "P" de Parkit (automática) o la etiqueta de estado (con aprobación). */
  chip: ChipState | null;
  /** "$4.500". */
  amountLabel: string;
  /** Reembolso de la rechazada ("Reembolso en curso", "Devuelto $4.500"). */
  refund: { label: string; tone: keyof typeof chipColors } | null;
  /** Texto del talón, con una clave por contenido para cruzarlo. */
  stub: { key: string; node: ReactNode };
  /** Fondo de la pantalla: las muescas del troquelado lo dejan ver. */
  notchColor: string;
};

const DIM = 0.3;
const PERFORATIONS = 18;
const CODE_CHAR_MS = 340;
const PERF_DASH_MS = 150;
/** "Ya terminó": cualquier letra o rayita a esta altura está completa. */
const DONE = 10_000;

/**
 * Ticket de la reserva: código letra por letra, troquelado y talón con el
 * lugar y el autito. Pendiente o rechazada, el código queda atenuado.
 */
export function ReservationTicket({
  stage,
  kind,
  runKey,
  reduced,
  focused,
  code,
  chip,
  amountLabel,
  refund,
  stub,
  notchColor,
}: Props) {
  const entering =
    !reduced && (kind === 'celebrate' || kind === 'payToPending');
  const swapping = !reduced && (kind === 'accept' || kind === 'reject');
  const at = kind === 'payToPending' ? T.payToPending : T.celebrate;

  const codeTarget = stage === 'confirmed' ? 1 : DIM;
  const codeT = useSharedValue(entering ? 0 : DONE);
  const codeFrom = useSharedValue(entering ? 0 : codeTarget);
  const codeTo = useSharedValue(codeTarget);
  const codeDy = useSharedValue(5);
  const perfT = useSharedValue(entering ? 0 : DONE);
  const gray = useSharedValue(stage === 'rejected' ? 1 : 0);

  useEffect(() => {
    const chars = code.length;
    const run = (from: number, to: number, dy: number, delay: number) => {
      const total = (chars - 1) * CODE_STAGGER_MS + CODE_CHAR_MS;
      codeFrom.value = from;
      codeTo.value = to;
      codeDy.value = dy;
      codeT.value = 0;
      codeT.value = withDelay(
        LEAD_MS + delay,
        withTiming(total, { duration: total }),
      );
    };
    if (entering) {
      run(0, codeTarget, 5, at.code);
      const perfTotal =
        (PERFORATIONS - 1) * PERFORATION_STAGGER_MS + PERF_DASH_MS;
      perfT.value = 0;
      perfT.value = withDelay(
        LEAD_MS + at.perforation,
        withTiming(perfTotal, { duration: perfTotal }),
      );
      gray.value = 0;
      return;
    }
    if (swapping && kind === 'accept') {
      // El código toma contraste pleno letra por letra.
      run(DIM, 1, 3, T.accept.code);
      return;
    }
    if (swapping && kind === 'reject') {
      gray.value = withDelay(
        LEAD_MS + T.reject.stubGray,
        withTiming(1, { duration: 420 }),
      );
      return;
    }
    cancelAnimation(codeT);
    cancelAnimation(perfT);
    cancelAnimation(gray);
    codeT.value = DONE;
    codeTo.value = codeTarget;
    perfT.value = DONE;
    gray.value = stage === 'rejected' ? 1 : 0;
  }, [runKey]);

  const stubStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      gray.value,
      [0, 1],
      [ticketColors.stub, ticketColors.stubMuted],
    ),
  }));

  const swapDelay = (accept: number, reject: number) =>
    kind === 'reject' ? reject : accept;

  return (
    <Reveal
      play={entering}
      runKey={runKey}
      delay={at.ticket}
      dy={24}
      config={SPRING.ticket}
      style={styles.wrap}
    >
      <View style={styles.ticket}>
        <View style={styles.main}>
          <Reveal play={entering} runKey={runKey} delay={at.ticketTop} dy={0}>
            <View style={styles.top}>
              <Text style={styles.label}>
                {chip ? 'Código' : 'Código de reserva'}
              </Text>
              {chip ? (
                <StatusChip
                  state={chip}
                  animate={swapping}
                  delay={swapDelay(T.accept.chip, T.reject.chip)}
                />
              ) : (
                <View style={styles.mark}>
                  <Text style={styles.markText}>P</Text>
                </View>
              )}
            </View>
          </Reveal>
          <View
            style={styles.code}
            accessible
            accessibilityLabel={`Código de reserva ${code.split('').join(' ')}`}
          >
            {code.split('').map((char, index) => (
              <CodeChar
                // El código no cambia: el índice identifica la letra.
                key={index}
                char={char}
                index={index}
                t={codeT}
                from={codeFrom}
                to={codeTo}
                dy={codeDy}
              />
            ))}
          </View>
          <Reveal play={entering} runKey={runKey} delay={at.paidLine} dy={4}>
            <Swap
              swapKey={stage === 'rejected' ? 'refund' : 'paid'}
              animate={swapping}
              delay={T.reject.paidLine}
              dy={5}
            >
              {stage === 'rejected' && refund ? (
                <View style={styles.line}>
                  <View
                    style={[
                      styles.refundChip,
                      {
                        backgroundColor: chipColors[refund.tone].surface,
                        borderColor: chipColors[refund.tone].border,
                      },
                    ]}
                  >
                    <MotionIcon
                      name="refund"
                      size={12}
                      color={chipColors[refund.tone].text}
                    />
                    <Text
                      style={[
                        styles.refundText,
                        { color: chipColors[refund.tone].text },
                      ]}
                    >
                      {refund.label}
                    </Text>
                  </View>
                  <Text style={styles.lineText}>{amountLabel}</Text>
                </View>
              ) : (
                <View style={styles.line}>
                  <MotionIcon name="paid" />
                  <Text style={styles.lineText}>
                    Pagaste <Text style={styles.strong}>{amountLabel}</Text> con
                    Mercado Pago
                  </Text>
                </View>
              )}
            </Swap>
          </Reveal>
        </View>

        <View style={styles.perforation}>
          {Array.from({ length: PERFORATIONS }, (_, index) => (
            <PerforationDash key={index} index={index} t={perfT} />
          ))}
          <View
            style={[
              styles.notch,
              styles.notchLeft,
              { backgroundColor: notchColor },
            ]}
          />
          <View
            style={[
              styles.notch,
              styles.notchRight,
              { backgroundColor: notchColor },
            ]}
          />
        </View>

        <Animated.View style={[styles.stub, stubStyle]}>
          <View style={styles.stubContent}>
            <Reveal play={entering} runKey={runKey} delay={at.stub} dy={4}>
              <Swap
                swapKey={stub.key}
                animate={swapping}
                delay={swapDelay(T.accept.stub, T.reject.stub)}
                dy={5}
              >
                {stub.node}
              </Swap>
            </Reveal>
          </View>
          <ParkingSlotCar
            stage={stage}
            kind={kind}
            runKey={runKey}
            wide={chip !== null}
            reduced={reduced}
            focused={focused}
          />
        </Animated.View>
      </View>
    </Reveal>
  );
}

function CodeChar({
  char,
  index,
  t,
  from,
  to,
  dy,
}: {
  char: string;
  index: number;
  t: SharedValue<number>;
  from: SharedValue<number>;
  to: SharedValue<number>;
  dy: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(
      1,
      Math.max(0, (t.value - index * CODE_STAGGER_MS) / CODE_CHAR_MS),
    );
    // Salida suave (≈ la cúbica "out" del prototipo).
    const e = 1 - Math.pow(1 - p, 4);
    return {
      opacity: from.value + (to.value - from.value) * e,
      transform: [{ translateY: dy.value * (1 - e) }],
    };
  });
  return <Animated.Text style={[styles.codeChar, style]}>{char}</Animated.Text>;
}

function PerforationDash({
  index,
  t,
}: {
  index: number;
  t: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(
      1,
      Math.max(0, (t.value - index * PERFORATION_STAGGER_MS) / PERF_DASH_MS),
    );
    const e = 1 - Math.pow(1 - p, 3);
    return { opacity: p, transform: [{ scaleX: e }] };
  });
  return <Animated.View style={[styles.dash, style]} />;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  ticket: {
    backgroundColor: driverColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ticketColors.tabTrack,
    overflow: 'hidden',
  },
  main: { paddingTop: 14, paddingHorizontal: 14, paddingBottom: 2 },
  top: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: ticketColors.label,
  },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: driverColors.brand,
  },
  markText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  code: {
    flexDirection: 'row',
    marginTop: 2,
    marginBottom: 8,
  },
  codeChar: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 3,
    color: ticketColors.ink,
    fontVariant: ['tabular-nums'],
  },
  line: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
  },
  lineText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: ticketColors.inkSoft,
  },
  strong: { fontWeight: '800', color: ticketColors.ink },
  refundChip: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  refundText: { fontSize: 11, fontWeight: '700' },
  perforation: {
    height: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dash: {
    width: 7,
    height: 2,
    borderRadius: 2,
    backgroundColor: ticketColors.perforation,
    transformOrigin: 'left',
  },
  notch: {
    position: 'absolute',
    top: 1,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: ticketColors.tabTrack,
  },
  notchLeft: { left: -10 },
  notchRight: { right: -10 },
  stub: {
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stubContent: { flex: 1, minWidth: 0 },
});
