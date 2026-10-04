import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { SlotGlyph as GlyphVariant } from '../../reservationBuckets';
import { amberColors, driverColors, ticketColors } from '../../theme';
import { CarTopView } from './CarTopView';
import { spring } from './timeline';

const SLOT_D = 'M27 5.5 H7.5 a3 3 0 0 0 -3 3 V27.5 a3 3 0 0 0 3 3 H27';
const WAIT_X = 24;

const BACKGROUND: Record<GlyphVariant, string> = {
  wait: amberColors.surface,
  in: '#eef4ff',
  done: '#f2f4f7',
  empty: '#f6f7f9',
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CAR_SPRING = spring(620, 0.6);

function targets(variant: GlyphVariant) {
  return {
    carX: variant === 'wait' ? WAIT_X : 0,
    car: variant === 'empty' ? 0 : variant === 'done' ? 0.5 : 1,
    amber: variant === 'wait' ? 0.7 : 0,
    blue: variant === 'in' ? 1 : 0,
  };
}

/**
 * El lugar y el autito de cada tarjeta de "Mis reservas": afuera esperando
 * (ámbar), adentro (azul), gris (pasada) o el lugar punteado vacío
 * (cancelada). Si la reserva cambia en pantalla, el autito entra.
 */
export function SlotGlyph({
  variant,
  reduced,
}: {
  variant: GlyphVariant;
  reduced: boolean;
}) {
  const start = targets(variant);
  const carX = useSharedValue(start.carX);
  const car = useSharedValue(start.car);
  const amber = useSharedValue(start.amber);
  const blue = useSharedValue(start.blue);
  const background = useSharedValue(BACKGROUND[variant]);
  const shown = useRef(variant);

  useEffect(() => {
    if (shown.current === variant) return;
    shown.current = variant;
    const end = targets(variant);
    if (reduced) {
      carX.value = end.carX;
      car.value = end.car;
      amber.value = end.amber;
      blue.value = end.blue;
      background.value = BACKGROUND[variant];
      return;
    }
    // Guion del prototipo: el autito entra con resorte y el borde se pone azul.
    carX.value = withDelay(80, withSpring(end.carX, CAR_SPRING));
    car.value = withDelay(80, withTiming(end.car, { duration: 220 }));
    amber.value = withDelay(80, withTiming(end.amber, { duration: 220 }));
    blue.value = withDelay(480, withTiming(end.blue, { duration: 280 }));
    background.value = withDelay(
      80,
      withTiming(BACKGROUND[variant], { duration: 400 }),
    );
  }, [variant]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: background.value,
  }));
  const carStyle = useAnimatedStyle(() => ({
    opacity: car.value,
    transform: [{ translateX: carX.value }],
  }));
  const amberProps = useAnimatedProps(() => ({ strokeOpacity: amber.value }));
  const blueProps = useAnimatedProps(() => ({ strokeOpacity: blue.value }));

  return (
    <Animated.View
      style={[styles.box, boxStyle]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Svg width={50} height={36} viewBox="0 0 50 36" style={styles.svg}>
        <Path
          d={SLOT_D}
          fill="none"
          stroke={ticketColors.slotBase}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray={variant === 'empty' ? [2.4, 2.6] : undefined}
        />
        <AnimatedPath
          d={SLOT_D}
          fill="none"
          stroke={amberColors.strong}
          strokeWidth={1.4}
          strokeLinecap="round"
          animatedProps={amberProps}
        />
        <AnimatedPath
          d={SLOT_D}
          fill="none"
          stroke={driverColors.brand}
          strokeWidth={1.4}
          strokeLinecap="round"
          animatedProps={blueProps}
        />
      </Svg>
      <Animated.View style={[styles.car, carStyle]}>
        <CarTopView width={21} height={11.7} muted={variant === 'done'} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 50,
    height: 36,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  svg: { position: 'absolute', left: 0, top: 0 },
  car: { position: 'absolute', left: 5.5, top: 12.2, width: 21, height: 11.7 },
});
