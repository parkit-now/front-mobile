import { useEffect, useRef } from 'react';
import {
  Animated as NativeAnimated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { MotionKind } from '../../reservationMotion';
import { amberColors, driverColors, ticketColors } from '../../theme';
import { CarTopView } from './CarTopView';
import { EASE, LEAD_MS, SPRING, T } from './timeline';

export type SlotStage = 'pending' | 'confirmed' | 'rejected';

type Props = {
  stage: SlotStage;
  kind: MotionKind;
  runKey: number;
  /** Con aprobación: deja lugar para que el autito espere afuera. */
  wide: boolean;
  reduced: boolean;
  /** La respiración del borde sólo corre con la pantalla a la vista. */
  focused: boolean;
};

const SLOT_D =
  'M55 1.5 H5 a3.5 3.5 0 0 0 -3.5 3.5 V29 a3.5 3.5 0 0 0 3.5 3.5 H55';
/** Afuera, frenado en la línea del lugar. */
const WAIT_X = 45;
const GONE_X = 92;
/** Opacidad del borde ámbar mientras espera, y el piso de la respiración. */
const WAIT_OPACITY = 0.6;
const BREATH_LOW = 0.22;

function SlotOutline({ color }: { color: string }) {
  return (
    <Svg width={56} height={34} viewBox="0 0 56 34">
      <Path
        d={SLOT_D}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function finalCar(stage: SlotStage) {
  switch (stage) {
    case 'confirmed':
      return { x: 0, opacity: 1, on: 1, wait: 0 };
    case 'pending':
      return { x: WAIT_X, opacity: 1, on: 0, wait: 1 };
    case 'rejected':
      return { x: GONE_X, opacity: 0, on: 0, wait: 0 };
  }
}

function initialCar(stage: SlotStage, kind: MotionKind, reduced: boolean) {
  if (reduced) return finalCar(stage);
  if (kind === 'celebrate') return { x: 60, opacity: 0, on: 0, wait: 0 };
  if (kind === 'payToPending') return { x: 110, opacity: 0, on: 0, wait: 0 };
  return finalCar(stage);
}

/**
 * El lugar del talón y el autito: entra (confirmada), espera en la línea con
 * el borde que respira (pendiente) o sale marcha atrás (rechazada).
 */
export function ParkingSlotCar({
  stage,
  kind,
  runKey,
  wide,
  reduced,
  focused,
}: Props) {
  const start = initialCar(stage, kind, reduced);
  const carX = useSharedValue(start.x);
  const carOpacity = useSharedValue(start.opacity);
  const slotOn = useSharedValue(start.on);
  const waitBase = useSharedValue(start.wait);

  useEffect(() => {
    const end = finalCar(stage);
    if (reduced || kind === 'still') {
      [carX, carOpacity, slotOn, waitBase].forEach((value) => {
        cancelAnimation(value);
      });
      carX.value = end.x;
      carOpacity.value = end.opacity;
      slotOn.value = end.on;
      waitBase.value = end.wait;
      return;
    }
    const at = (ms: number) => LEAD_MS + ms;
    switch (kind) {
      case 'celebrate':
        carX.value = withDelay(
          at(T.celebrate.car),
          withSpring(0, SPRING.carIn),
        );
        carOpacity.value = withDelay(
          at(T.celebrate.car),
          withTiming(1, { duration: 100 }),
        );
        slotOn.value = withDelay(
          at(T.celebrate.slotOn),
          withTiming(1, { duration: 260 }),
        );
        break;
      case 'payToPending':
        carX.value = withDelay(
          at(T.payToPending.car),
          withTiming(WAIT_X, { duration: 700, easing: EASE.brake }),
        );
        carOpacity.value = withDelay(
          at(T.payToPending.car),
          withTiming(1, { duration: 140 }),
        );
        waitBase.value = withDelay(
          at(T.payToPending.slotWait),
          withTiming(1, { duration: 400 }),
        );
        break;
      case 'accept':
        waitBase.value = withDelay(
          at(T.accept.car),
          withTiming(0, { duration: 240 }),
        );
        carX.value = withDelay(
          at(T.accept.car),
          withSpring(0, SPRING.carAccept),
        );
        slotOn.value = withDelay(
          at(T.accept.slotOn),
          withTiming(1, { duration: 300 }),
        );
        break;
      case 'reject':
        waitBase.value = withDelay(
          at(T.reject.car),
          withTiming(0, { duration: 260 }),
        );
        // Marcha atrás: arranca lento y se va; se desvanece al final.
        carX.value = withDelay(
          at(T.reject.car),
          withTiming(GONE_X, { duration: 560, easing: EASE.reverse }),
        );
        carOpacity.value = withDelay(
          at(T.reject.car + 336),
          withTiming(0, { duration: 224 }),
        );
        break;
    }
    // Sólo con cada coreografía nueva.
  }, [runKey]);

  // Única animación en loop: el borde ámbar respira mientras espera. Se corta
  // al cambiar de estado o al salir de la pantalla, y no arranca con
  // "Reducir movimiento". Va con el driver nativo de Animated sobre la
  // opacidad de una vista con textura propia: el SVG se dibuja una sola vez.
  // Con Reanimated sobre `strokeOpacity` el SVG se volvía a rasterizar en cada
  // frame durante toda la espera (en un Galaxy A51, 46 fps contra 50 fps y
  // p90 de 44 ms contra 38 ms). La capa de arriba queda en opacidad 1
  // mientras respira, así no se suman dos fundidos.
  const breath = useRef(new NativeAnimated.Value(WAIT_OPACITY)).current;
  useEffect(() => {
    breath.stopAnimation();
    breath.setValue(WAIT_OPACITY);
    if (stage !== 'pending' || !focused || reduced) return;
    const startAt =
      kind === 'payToPending' ? LEAD_MS + T.payToPending.breathe : 0;
    const half = (toValue: number) =>
      NativeAnimated.timing(breath, {
        toValue,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      });
    const loop = NativeAnimated.sequence([
      NativeAnimated.delay(startAt),
      NativeAnimated.loop(
        NativeAnimated.sequence([half(BREATH_LOW), half(WAIT_OPACITY)]),
      ),
    ]);
    loop.start();
    return () => {
      loop.stop();
    };
  }, [stage, focused, reduced, runKey]);

  const carStyle = useAnimatedStyle(() => ({
    opacity: carOpacity.value,
    transform: [{ translateX: carX.value }],
  }));
  const waitStyle = useAnimatedStyle(() => ({ opacity: waitBase.value }));
  const onStyle = useAnimatedStyle(() => ({ opacity: slotOn.value }));

  return (
    <View
      style={[styles.slot, { width: wide ? 92 : 56 }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Svg width={56} height={34} viewBox="0 0 56 34" style={styles.svg}>
        <Path
          d={SLOT_D}
          fill="none"
          stroke={ticketColors.slotBase}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
      {/* Bordes de color en capas propias: animar la opacidad de la vista no
          redibuja el SVG (la respiración corre en cada frame). */}
      <Animated.View style={[styles.svg, waitStyle]}>
        <NativeAnimated.View
          style={{ opacity: breath }}
          renderToHardwareTextureAndroid
        >
          <SlotOutline color={amberColors.strong} />
        </NativeAnimated.View>
      </Animated.View>
      <Animated.View
        style={[styles.svg, onStyle]}
        renderToHardwareTextureAndroid
      >
        <SlotOutline color={driverColors.brand} />
      </Animated.View>
      <Animated.View style={[styles.car, carStyle]}>
        <CarTopView width={34} height={19} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: 34, flexShrink: 0 },
  svg: { position: 'absolute', left: 0, top: 0 },
  car: { position: 'absolute', left: 9, top: 7.5, width: 34, height: 19 },
});
