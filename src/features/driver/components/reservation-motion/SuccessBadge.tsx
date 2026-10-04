import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { approvalProgress, type MotionKind } from '../../reservationMotion';
import { amberColors, driverColors, ticketColors } from '../../theme';
import { EASE, LEAD_MS, SPRING, T } from './timeline';

export type BadgeStage = 'pending' | 'confirmed' | 'rejected';

type Props = {
  stage: BadgeStage;
  kind: MotionKind;
  runKey: number;
  reduced: boolean;
  /** Plazo del estacionamiento: el anillo ámbar es el tiempo real que queda. */
  approvalDeadlineAt: string | null;
  approvalWindowMinutes: number;
};

const SIZE = 84;
const R = 34;
const CIRCUMFERENCE = 2 * Math.PI * R;
/** Largo del tilde M30.5 45 L40 54.5 L58.5 35.5. */
const CHECK_LENGTH = 40;
const CHECK_D = 'M30.5 45 L40 54.5 L58.5 35.5';
const HAND_D = 'M44 36.5 V44 L49.2 47.2';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

type Values = {
  badgeScale: number;
  ok: number;
  fillScale: number;
  fillOpacity: number;
  outline: number;
  check: number;
  pending: number;
  pendingScale: number;
  arc: number;
  arcBlue: number;
  track: number;
  clock: number;
  clockScale: number;
  hand: number;
  info: number;
  infoScale: number;
  glowOk: number;
  glowPending: number;
};

function finalValues(stage: BadgeStage, progress: number): Values {
  const base: Values = {
    badgeScale: 1,
    ok: 0,
    fillScale: 1,
    fillOpacity: 1,
    outline: 1,
    check: 1,
    pending: 0,
    pendingScale: 1,
    arc: 0,
    arcBlue: 0,
    track: 1,
    clock: 1,
    clockScale: 1,
    hand: 0,
    info: 0,
    infoScale: 1,
    glowOk: 0,
    glowPending: 0,
  };
  switch (stage) {
    case 'confirmed':
      return { ...base, ok: 1, glowOk: 1 };
    case 'pending':
      return { ...base, pending: 1, arc: progress, glowPending: 1 };
    case 'rejected':
      return { ...base, info: 1, track: 0, clock: 0 };
  }
}

function initialValues(
  stage: BadgeStage,
  kind: MotionKind,
  reduced: boolean,
  progress: number,
): Values {
  const end = finalValues(stage, progress);
  if (reduced) return end;
  const okHidden = {
    badgeScale: 0.8,
    ok: 1,
    fillScale: 0.5,
    fillOpacity: 0,
    outline: 0,
    check: 0,
    glowOk: 0,
  };
  if (kind === 'celebrate') return { ...end, ...okHidden };
  if (kind === 'payToPending') {
    return {
      ...end,
      ...okHidden,
      pending: 0,
      pendingScale: 0.92,
      arc: 0,
      clock: 0,
      clockScale: 0.6,
      hand: -300,
      glowPending: 0,
    };
  }
  return end;
}

/**
 * Insignia de la reserva: tilde azul (pago o confirmación), anillo ámbar con
 * reloj mientras espera al estacionamiento, o ícono gris de información si no
 * se pudo confirmar. Las tres capas se cruzan como en el prototipo.
 */
export function SuccessBadge({
  stage,
  kind,
  runKey,
  reduced,
  approvalDeadlineAt,
  approvalWindowMinutes,
}: Props) {
  const progressNow = () =>
    approvalProgress(approvalDeadlineAt, approvalWindowMinutes, Date.now());
  const start = initialValues(stage, kind, reduced, progressNow());

  const badgeScale = useSharedValue(start.badgeScale);
  const ok = useSharedValue(start.ok);
  const fillScale = useSharedValue(start.fillScale);
  const fillOpacity = useSharedValue(start.fillOpacity);
  const outline = useSharedValue(start.outline);
  const check = useSharedValue(start.check);
  const pending = useSharedValue(start.pending);
  const pendingScale = useSharedValue(start.pendingScale);
  const arc = useSharedValue(start.arc);
  const arcBlue = useSharedValue(start.arcBlue);
  const track = useSharedValue(start.track);
  const clock = useSharedValue(start.clock);
  const clockScale = useSharedValue(start.clockScale);
  const hand = useSharedValue(start.hand);
  const info = useSharedValue(start.info);
  const infoScale = useSharedValue(start.infoScale);
  const glowOk = useSharedValue(start.glowOk);
  const glowPending = useSharedValue(start.glowPending);
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);

  useEffect(() => {
    const values: Record<keyof Values, SharedValue<number>> = {
      badgeScale,
      ok,
      fillScale,
      fillOpacity,
      outline,
      check,
      pending,
      pendingScale,
      arc,
      arcBlue,
      track,
      clock,
      clockScale,
      hand,
      info,
      infoScale,
      glowOk,
      glowPending,
    };
    const at = (ms: number) => LEAD_MS + ms;

    if (reduced || kind === 'still') {
      const end = finalValues(stage, progressNow());
      (Object.keys(values) as Array<keyof Values>).forEach((name) => {
        cancelAnimation(values[name]);
        values[name].value = end[name];
      });
      return;
    }

    // Tilde azul: contorno, relleno con rebote y tilde dibujado.
    const drawCheck = (from: number) => {
      outline.value = withDelay(
        at(from),
        withTiming(1, { duration: 320, easing: EASE.draw }),
      );
      badgeScale.value = withDelay(at(from + 250), withSpring(1, SPRING.badge));
      fillScale.value = withDelay(at(from + 250), withSpring(1, SPRING.fill));
      fillOpacity.value = withDelay(
        at(from + 250),
        withTiming(1, { duration: 180, easing: EASE.out }),
      );
      check.value = withDelay(
        at(from + 290),
        withTiming(1, { duration: 260, easing: EASE.draw }),
      );
    };
    const pulse = (from: number) => {
      [ring1, ring2].forEach((ring, i) => {
        ring.value = withDelay(
          at(from + i * 150),
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: 720, easing: EASE.pulse }),
          ),
        );
      });
    };

    switch (kind) {
      case 'celebrate': {
        drawCheck(T.celebrate.outline);
        glowOk.value = withDelay(
          at(T.celebrate.glow),
          withTiming(1, { duration: 520, easing: EASE.out }),
        );
        pulse(T.celebrate.pulse);
        break;
      }
      case 'payToPending': {
        const c = T.payToPending;
        drawCheck(c.outline);
        glowOk.value = withDelay(
          at(c.glow),
          withSequence(
            withTiming(1, { duration: 360, easing: EASE.out }),
            withTiming(0, { duration: 540 }),
          ),
        );
        // El tilde se funde en el círculo ámbar.
        ok.value = withDelay(at(c.okOut), withTiming(0, { duration: 252 }));
        pending.value = withDelay(
          at(c.pending),
          withTiming(1, { duration: 220 }),
        );
        pendingScale.value = withDelay(
          at(c.pending),
          withSpring(1, SPRING.soft),
        );
        arc.value = withDelay(
          at(c.arc),
          withTiming(progressNow(), { duration: 700, easing: EASE.draw }),
        );
        clock.value = withDelay(at(c.clock), withTiming(1, { duration: 160 }));
        clockScale.value = withDelay(at(c.clock), withSpring(1, SPRING.fill));
        hand.value = withDelay(
          at(c.hand),
          withTiming(0, { duration: 900, easing: EASE.out }),
        );
        glowPending.value = withDelay(
          at(c.clock),
          withTiming(1, { duration: 600 }),
        );
        break;
      }
      case 'accept': {
        const c = T.accept;
        // El anillo se completa y se vuelve azul: es el contorno del tilde.
        arc.value = withTiming(1, { duration: 308, easing: EASE.out });
        arcBlue.value = withTiming(1, { duration: 308, easing: EASE.out });
        clock.value = withTiming(0, { duration: 220, easing: EASE.out });
        clockScale.value = withTiming(0.7, { duration: 220, easing: EASE.out });
        glowPending.value = withTiming(0, { duration: 300 });
        pending.value = withDelay(
          at(c.pendingOut),
          withTiming(0, { duration: 213 }),
        );
        outline.value = 1;
        fillScale.value = 0.5;
        fillOpacity.value = 0;
        check.value = 0;
        ok.value = withDelay(at(c.ok), withTiming(1, { duration: 80 }));
        fillScale.value = withDelay(at(c.ok), withSpring(1, SPRING.fill));
        fillOpacity.value = withDelay(
          at(c.ok),
          withTiming(1, { duration: 180, easing: EASE.out }),
        );
        check.value = withDelay(
          at(c.check),
          withTiming(1, { duration: 260, easing: EASE.draw }),
        );
        badgeScale.value = withDelay(
          at(c.ok),
          withSequence(
            withTiming(0.92, { duration: 0 }),
            withSpring(1, SPRING.badge),
          ),
        );
        glowOk.value = withDelay(
          at(c.glow),
          withTiming(1, { duration: 520, easing: EASE.out }),
        );
        pulse(c.pulse);
        break;
      }
      case 'reject': {
        const c = T.reject;
        // Calma: el anillo se retira y aparece información gris, sin rebote.
        arc.value = withTiming(0, { duration: 420, easing: EASE.draw });
        track.value = withDelay(at(c.track), withTiming(0, { duration: 360 }));
        clock.value = withTiming(0, { duration: 220, easing: EASE.out });
        clockScale.value = withTiming(0.7, { duration: 220, easing: EASE.out });
        glowPending.value = withTiming(0, { duration: 300 });
        pending.value = withDelay(
          at(c.pendingOut),
          withTiming(0, { duration: 308 }),
        );
        infoScale.value = 0.9;
        info.value = withDelay(
          at(c.info),
          withTiming(1, { duration: 420, easing: EASE.out }),
        );
        infoScale.value = withDelay(
          at(c.info),
          withTiming(1, { duration: 420, easing: EASE.out }),
        );
        break;
      }
    }
    // Sólo con cada coreografía nueva.
  }, [runKey]);

  // El anillo ámbar baja con el tiempo real, una vez por segundo.
  useEffect(() => {
    if (stage !== 'pending') return;
    const tick = () => {
      arc.value = withTiming(progressNow(), {
        duration: 1000,
        easing: EASE.linear,
      });
    };
    let interval: ReturnType<typeof setInterval> | undefined;
    const startIn =
      kind === 'payToPending' && !reduced
        ? LEAD_MS + T.payToPending.arc + 700
        : 0;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, startIn);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [stage, runKey, approvalDeadlineAt, approvalWindowMinutes]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));
  const okStyle = useAnimatedStyle(() => ({ opacity: ok.value }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
    transform: [{ scale: fillScale.value }],
  }));
  const pendingStyle = useAnimatedStyle(() => ({
    opacity: pending.value,
    transform: [{ scale: pendingScale.value }],
  }));
  const clockStyle = useAnimatedStyle(() => ({
    opacity: clock.value,
    transform: [{ scale: clockScale.value }],
  }));
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${hand.value}deg` }],
  }));
  const infoStyle = useAnimatedStyle(() => ({
    opacity: info.value,
    transform: [{ scale: infoScale.value }],
  }));
  const glowOkStyle = useAnimatedStyle(() => ({
    opacity: glowOk.value,
    transform: [{ scale: 0.6 + 0.4 * glowOk.value }],
  }));
  const glowPendingStyle = useAnimatedStyle(() => ({
    opacity: glowPending.value,
  }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1.value > 0 ? 0.55 * (1 - ring1.value) : 0,
    transform: [{ scale: 1 + 0.8 * ring1.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2.value > 0 ? 0.55 * (1 - ring2.value) : 0,
    transform: [{ scale: 1 + 0.55 * ring2.value }],
  }));

  const outlineProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1.05 - 1.05 * outline.value),
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1.05 - 1.05 * check.value),
  }));
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - arc.value),
    strokeOpacity: arc.value > 0.001 ? 1 : 0,
  }));
  const arcBlueProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - arc.value),
    strokeOpacity: arcBlue.value,
  }));
  const trackProps = useAnimatedProps(() => ({ strokeOpacity: track.value }));

  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View
      style={styles.hero}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View style={[styles.glow, glowPendingStyle]}>
        <Glow id={`gp${id}`} color={amberColors.strong} opacity={0.2} />
      </Animated.View>
      <Animated.View style={[styles.glow, glowOkStyle]}>
        <Glow id={`go${id}`} color={driverColors.brand} opacity={0.32} />
      </Animated.View>
      <Animated.View style={[styles.ring, ring1Style]} />
      <Animated.View style={[styles.ring, ring2Style]} />

      <Animated.View style={[styles.badge, badgeStyle]}>
        {/* Esperando al estacionamiento */}
        <Animated.View style={[styles.layer, pendingStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
            <Circle cx="44" cy="44" r={R} fill={amberColors.surface} />
            <AnimatedCircle
              cx="44"
              cy="44"
              r={R}
              fill="none"
              stroke={amberColors.track}
              strokeWidth={3}
              animatedProps={trackProps}
            />
          </Svg>
          <View style={[styles.layer, styles.fromTop]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
              <AnimatedCircle
                cx="44"
                cy="44"
                r={R}
                fill="none"
                stroke={amberColors.text}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
                animatedProps={arcProps}
              />
              <AnimatedCircle
                cx="44"
                cy="44"
                r={R}
                fill="none"
                stroke={driverColors.brand}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
                animatedProps={arcBlueProps}
              />
            </Svg>
          </View>
          <Animated.View style={[styles.layer, clockStyle]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
              <Circle
                cx="44"
                cy="44"
                r="13"
                fill="none"
                stroke={amberColors.text}
                strokeWidth={2.6}
              />
            </Svg>
            <Animated.View style={[styles.layer, handStyle]}>
              <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
                <Path
                  d={HAND_D}
                  fill="none"
                  stroke={amberColors.text}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* No se pudo confirmar: información, sin alarma */}
        <Animated.View style={[styles.layer, infoStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
            <Circle cx="44" cy="44" r={R} fill={ticketColors.infoSurface} />
            <Circle
              cx="44"
              cy="44"
              r="33"
              fill="none"
              stroke={ticketColors.infoBorder}
              strokeWidth={2}
            />
            <Circle cx="44" cy="32.5" r="3.1" fill={ticketColors.infoInk} />
            <Path
              d="M44 41 V56"
              fill="none"
              stroke={ticketColors.infoInk}
              strokeWidth={5}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Pago aprobado / reserva confirmada */}
        <Animated.View style={[styles.layer, okStyle]}>
          <Animated.View style={[styles.layer, fillStyle]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
              <Defs>
                <LinearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={ticketColors.badgeTop} />
                  <Stop offset="1" stopColor={ticketColors.badgeBottom} />
                </LinearGradient>
              </Defs>
              <Circle cx="44" cy="44" r={R} fill={`url(#b${id})`} />
            </Svg>
          </Animated.View>
          <View style={[styles.layer, styles.fromTop]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
              <AnimatedCircle
                cx="44"
                cy="44"
                r={R}
                fill="none"
                stroke={driverColors.brand}
                strokeWidth={3}
                strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE * 1.1]}
                animatedProps={outlineProps}
              />
            </Svg>
          </View>
          <View style={styles.layer}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 88 88">
              <AnimatedPath
                d={CHECK_D}
                fill="none"
                stroke="#ffffff"
                strokeWidth={5.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH * 1.1]}
                animatedProps={checkProps}
              />
            </Svg>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Glow({
  id,
  color,
  opacity,
}: {
  id: string;
  color: string;
  opacity: number;
}) {
  return (
    <Svg width={96} height={40} viewBox="0 0 96 40">
      <Defs>
        <RadialGradient
          id={id}
          cx="48"
          cy="20"
          rx="48"
          ry="20"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="48" cy="20" rx="48" ry="20" fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: 58,
    width: 96,
    height: 40,
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: driverColors.brand,
    alignSelf: 'center',
    top: 19,
  },
  badge: { width: SIZE, height: SIZE },
  layer: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  // El trazo arranca arriba (12 en punto), como en el prototipo.
  fromTop: { transform: [{ rotate: '-90deg' }] },
});
