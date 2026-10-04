import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { FrozenRevealContext } from './Reveal';
import { EASE, LEAD_MS, SPRING } from './timeline';

const OUT_MS = 180;
const IN_OFFSET_MS = 90;

type Props = {
  /** Identifica el contenido: cuando cambia, se cruza el viejo con el nuevo. */
  swapKey: string;
  /** `false`: cambia en seco (reducir movimiento, o sin coreografía). */
  animate: boolean;
  /** Momento del cruce en el guion. */
  delay: number;
  /** El nuevo sube desde `dy` px; el viejo sale `dy / 2` hacia arriba. */
  dy?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Cruce de contenidos (título, aviso, talón, etiqueta): el viejo se va hacia
 * arriba en 180 ms y el nuevo entra desde abajo con resorte, 90 ms después.
 * Es el `swap()` del prototipo, con el contenido saliente superpuesto.
 */
export function Swap({
  swapKey,
  animate,
  delay,
  dy = 6,
  style,
  children,
}: Props) {
  const latest = useRef<{ key: string; node: ReactNode }>({
    key: swapKey,
    node: children,
  });
  const [shownKey, setShownKey] = useState(swapKey);
  const [outgoing, setOutgoing] = useState<{
    key: string;
    node: ReactNode;
  } | null>(null);

  // Cambio de clave: se guarda lo último que se vio del contenido anterior.
  if (shownKey !== swapKey) {
    setShownKey(swapKey);
    setOutgoing(animate ? latest.current : null);
  }

  useEffect(() => {
    latest.current = { key: swapKey, node: children };
  });

  useEffect(() => {
    if (!outgoing) return;
    const id = setTimeout(
      () => {
        setOutgoing(null);
      },
      LEAD_MS + delay + OUT_MS + 60,
    );
    return () => {
      clearTimeout(id);
    };
  }, [outgoing, delay]);

  return (
    <View style={style}>
      <SwapIn
        key={swapKey}
        animate={outgoing !== null && outgoing.key !== swapKey}
        delay={delay}
        dy={dy}
      >
        {children}
      </SwapIn>
      {outgoing && outgoing.key !== swapKey ? (
        <SwapOut key={`out-${outgoing.key}`} delay={delay} dy={dy}>
          {outgoing.node}
        </SwapOut>
      ) : null}
    </View>
  );
}

function SwapIn({
  animate,
  delay,
  dy,
  children,
}: {
  animate: boolean;
  delay: number;
  dy: number;
  children: ReactNode;
}) {
  // Sólo importa al montarse: entra animado si vino por un cruce.
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (progress.value < 1) {
      progress.value = withDelay(
        LEAD_MS + delay + IN_OFFSET_MS,
        withSpring(1, SPRING.text),
      );
    }
  }, [delay, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (1 - progress.value) * dy }],
  }));
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function SwapOut({
  delay,
  dy,
  children,
}: {
  delay: number;
  dy: number;
  children: ReactNode;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      LEAD_MS + delay,
      withTiming(1, { duration: OUT_MS, easing: EASE.out }),
    );
  }, [delay, progress]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: (-progress.value * dy) / 2 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, animatedStyle]}
    >
      <FrozenRevealContext.Provider value={true}>
        {children}
      </FrozenRevealContext.Provider>
    </Animated.View>
  );
}
