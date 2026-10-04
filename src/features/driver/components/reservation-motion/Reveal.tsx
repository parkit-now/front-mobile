import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { LEAD_MS, SPRING } from './timeline';

/**
 * `true` dentro de un contenido que se está yendo (ver Swap): ese contenido es
 * una foto de lo que se veía y no vuelve a hacer su entrada.
 */
export const FrozenRevealContext = createContext(false);

type Props = {
  /** `false`: se muestra quieto en su lugar (sin animación de entrada). */
  play: boolean;
  /** Cambia cuando arranca una coreografía nueva. */
  runKey: number;
  /** Momento de entrada en el guion (ms, sin el margen inicial). */
  delay: number;
  /** Desde cuántos px abajo sube. */
  dy?: number;
  config?: WithSpringConfig;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Sube unos px y aparece con resorte: título, datos, botón, ticket. */
export function Reveal({
  play,
  runKey,
  delay,
  dy = 6,
  config = SPRING.text,
  style,
  children,
}: Props) {
  const frozen = useContext(FrozenRevealContext);
  const shouldPlay = play && !frozen;
  // El valor inicial ya oculta la pieza en el primer frame: no hay parpadeo.
  const progress = useSharedValue(shouldPlay ? 0 : 1);

  useEffect(() => {
    if (!shouldPlay) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(LEAD_MS + delay, withSpring(1, config));
    // Sólo se dispara con una coreografía nueva.
  }, [runKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: (1 - progress.value) * dy }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
