import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { amberColors, chipColors } from '../../theme';
import { Swap } from './Swap';
import { LEAD_MS, SPRING } from './timeline';

export type ChipState =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'rejected'
  | 'no_response';

const CHIP: Record<
  ChipState,
  { label: string; tone: keyof typeof chipColors; dot: boolean }
> = {
  pending: { label: 'Pendiente', tone: 'amber', dot: true },
  confirmed: { label: 'Confirmada', tone: 'blue', dot: false },
  in_progress: { label: 'En curso', tone: 'green', dot: false },
  rejected: { label: 'Rechazada', tone: 'rose', dot: false },
  no_response: { label: 'Sin respuesta', tone: 'rose', dot: false },
};

type Props = {
  state: ChipState;
  /** Cruce animado del texto, el color y el ancho (con resorte). */
  animate: boolean;
  /** Momento del cambio en el guion. */
  delay: number;
};

/**
 * Etiqueta de estado del ticket. "Pendiente" se estira a "Confirmada" con
 * resorte: el ancho se mide y se anima, el fondo cambia de color y el texto se
 * cruza.
 */
export function StatusChip({ state, animate, delay }: Props) {
  const chip = CHIP[state];
  const colors = chipColors[chip.tone];
  const width = useSharedValue(-1);
  const background = useSharedValue<string>(colors.surface);
  const border = useSharedValue<string>(colors.border);
  const animateRef = useRef(animate);
  animateRef.current = animate;

  useEffect(() => {
    if (!animate) {
      cancelAnimation(background);
      cancelAnimation(border);
      background.value = colors.surface;
      border.value = colors.border;
      return;
    }
    background.value = withDelay(
      LEAD_MS + delay,
      withTiming(colors.surface, { duration: 320 }),
    );
    border.value = withDelay(
      LEAD_MS + delay,
      withTiming(colors.border, { duration: 320 }),
    );
  }, [state]);

  function onLabelLayout(event: LayoutChangeEvent) {
    // + el borde de 1 px de cada lado.
    const next = Math.ceil(event.nativeEvent.layout.width) + 2;
    if (width.value < 0 || !animateRef.current) {
      width.value = next;
      return;
    }
    width.value = withDelay(LEAD_MS + delay, withSpring(next, SPRING.chip));
  }

  // Hasta medir la etiqueta, la pastilla no se ve (un solo frame).
  const chipStyle = useAnimatedStyle(() => ({
    width: Math.max(0, width.value),
    opacity: width.value < 0 ? 0 : 1,
    backgroundColor: background.value,
    borderColor: border.value,
  }));

  return (
    <Animated.View
      style={[styles.chip, chipStyle]}
      accessible
      accessibilityLabel={`Estado: ${chip.label}`}
    >
      {/* Medidor fuera del flujo: el ancho natural de la etiqueta nueva. */}
      <View style={styles.measure} pointerEvents="none">
        <View style={styles.label} onLayout={onLabelLayout}>
          <ChipLabel state={state} />
        </View>
      </View>
      <Swap
        swapKey={state}
        animate={animate}
        delay={delay}
        dy={8}
        style={styles.track}
      >
        <View style={styles.label}>
          <ChipLabel state={state} />
        </View>
      </Swap>
    </Animated.View>
  );
}

function ChipLabel({ state }: { state: ChipState }) {
  const chip = CHIP[state];
  return (
    <>
      {chip.dot ? <View style={styles.dot} /> : null}
      <Text style={[styles.text, { color: chipColors[chip.tone].text }]}>
        {chip.label.toUpperCase()}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 22,
    borderRadius: 99,
    borderWidth: 1,
    overflow: 'hidden',
  },
  measure: { position: 'absolute', left: 0, top: 0, width: 240, opacity: 0 },
  // Más ancho que cualquier etiqueta: el texto nunca se corta mientras la
  // pastilla se estira; lo que sobra lo recorta la pastilla.
  track: { width: 240 },
  label: {
    height: 20,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: amberColors.strong,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
});
