import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { driverColors, driverLayout, ticketColors } from '../../theme';
import { SPRING } from './timeline';

export type TabItem<K extends string> = {
  key: K;
  label: string;
  count: number;
};

type Props<K extends string> = {
  tabs: ReadonlyArray<TabItem<K>>;
  selected: K;
  onSelect: (key: K) => void;
  reduced: boolean;
  /** Fondo de la pantalla, para el degradé del borde derecho. */
  background: string;
};

type Box = { x: number; width: number };

/**
 * Pestañas con contador que se deslizan en horizontal. La pastilla blanca se
 * corre y cambia de ancho con resorte, y la fila se desplaza para que la
 * pestaña elegida quede entera a la vista.
 */
export function ReservationTabs<K extends string>({
  tabs,
  selected,
  onSelect,
  reduced,
  background,
}: Props<K>) {
  const scroll = useRef<ScrollView>(null);
  const boxes = useRef<Partial<Record<K, Box>>>({});
  const [viewport, setViewport] = useState(0);
  const placed = useRef(false);
  const x = useSharedValue(0);
  const width = useSharedValue(0);

  function place(animated: boolean) {
    const box = boxes.current[selected];
    if (!box) return;
    if (!placed.current || !animated || reduced) {
      x.value = box.x;
      width.value = box.width;
    } else {
      x.value = withSpring(box.x, SPRING.tab);
      width.value = withSpring(box.width, SPRING.tab);
    }
    placed.current = true;
    if (viewport > 0) {
      const target = Math.max(0, box.x - (viewport - box.width) / 2);
      scroll.current?.scrollTo({ x: target, animated: animated && !reduced });
    }
  }

  useEffect(() => {
    place(true);
  }, [selected, viewport]);

  function onTabLayout(key: K, event: LayoutChangeEvent) {
    const { x: left, width: w } = event.nativeEvent.layout;
    // Pantalla oculta (otra pestaña de abajo): no hay medida real.
    if (w <= 0) return;
    boxes.current[key] = { x: left, width: w };
    if (key === selected) place(placed.current);
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: width.value > 0 ? 1 : 0,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          if (next > 0) setViewport(next);
        }}
        accessibilityRole="tablist"
        accessibilityLabel="Estado de las reservas"
      >
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        {tabs.map((tab) => {
          const isSelected = tab.key === selected;
          return (
            <Pressable
              key={tab.key}
              onLayout={(event) => {
                onTabLayout(tab.key, event);
              }}
              onPress={() => {
                onSelect(tab.key);
              }}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              // react-native-web sólo traduce el `aria-*` (en RN 0.76 vale igual).
              aria-selected={isSelected}
              accessibilityLabel={`${tab.label}, ${tab.count} ${tab.count === 1 ? 'reserva' : 'reservas'}`}
            >
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {tab.label}
              </Text>
              <TabCount
                count={tab.count}
                selected={isSelected}
                reduced={reduced}
              />
            </Pressable>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={styles.fade}>
        <Svg width={26} height={42}>
          <Defs>
            <LinearGradient id="tabsFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={background} stopOpacity={0} />
              <Stop offset="1" stopColor={background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width={26} height={42} fill="url(#tabsFade)" />
        </Svg>
      </View>
    </View>
  );
}

/** El contador rueda cuando cambia (2 → 1) y da un saltito. */
function TabCount({
  count,
  selected,
  reduced,
}: {
  count: number;
  selected: boolean;
  reduced: boolean;
}) {
  const previous = useRef(count);
  const roll = useSharedValue(0);
  const bump = useSharedValue(1);

  useEffect(() => {
    if (previous.current === count) return;
    const up = count > previous.current;
    previous.current = count;
    if (reduced) return;
    roll.value = up ? 9 : -9;
    roll.value = withSpring(0, SPRING.text);
    bump.value = withSequence(
      withTiming(1.22, { duration: 180 }),
      withTiming(1, { duration: 340 }),
    );
  }, [count, reduced, roll, bump]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bump.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(roll.value) / 9),
    transform: [{ translateY: roll.value }],
  }));

  return (
    <Animated.View
      style={[styles.count, selected && styles.countSelected, badgeStyle]}
    >
      <Animated.Text
        style={[
          styles.countText,
          selected && styles.countTextSelected,
          textStyle,
        ]}
      >
        {count}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A sangre: la fila se desliza de borde a borde de la pantalla.
  wrap: { marginHorizontal: -driverLayout.horizontalPadding },
  row: {
    paddingHorizontal: driverLayout.horizontalPadding,
    paddingVertical: 4,
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    height: 34,
    borderRadius: 99,
    backgroundColor: driverColors.surface,
    borderWidth: 1,
    borderColor: '#d9e3f3',
  },
  tab: {
    height: 34,
    paddingLeft: 13,
    paddingRight: 11,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: ticketColors.meta,
  },
  labelSelected: { color: ticketColors.ink },
  count: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: ticketColors.tabCount,
  },
  countSelected: { backgroundColor: driverColors.brand },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: ticketColors.tabCountText,
    fontVariant: ['tabular-nums'],
  },
  countTextSelected: { color: '#ffffff' },
  fade: { position: 'absolute', right: 0, top: 0, bottom: 0 },
});
