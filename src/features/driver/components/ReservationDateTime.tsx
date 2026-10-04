import { useEffect, useRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { monthGrid, monthTitle } from '../reservationTime';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon } from './DriverIcon';

// Piezas del selector de ingreso / egreso del modal de reserva: un campo
// desplegable, un calendario mensual y una rueda de horas. Todo en JS (sin
// date pickers nativos) para respetar las reglas de la reserva: sólo días y
// horas dentro del horario de apertura y de los próximos 7 días.

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function MomentField({
  label,
  dateText,
  timeText,
  expanded,
  disabled = false,
  onToggle,
  children,
}: {
  label: string;
  dateText: string;
  timeText: string;
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, expanded && styles.fieldExpanded]}>
      <Pressable
        style={({ pressed }) => [styles.fieldHeader, pressed && styles.pressed]}
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded, disabled }}
        accessibilityLabel={`${label}: ${dateText}, ${timeText}. Tocar para cambiar`}
      >
        <View style={styles.fieldCopy}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={[styles.fieldValue, disabled && styles.textDisabled]}>
            {dateText}
          </Text>
        </View>
        <View style={styles.fieldTime}>
          <DriverIcon
            name="clock"
            size={16}
            color={disabled ? driverColors.disabled : driverColors.brand}
          />
          <Text style={[styles.fieldTimeText, disabled && styles.textDisabled]}>
            {timeText}
          </Text>
        </View>
      </Pressable>
      {expanded ? <View style={styles.fieldBody}>{children}</View> : null}
    </View>
  );
}

export function CalendarMonth({
  monthKey,
  enabledKeys,
  selectedKey,
  onSelect,
  onPrev,
  onNext,
}: {
  monthKey: string;
  enabledKeys: ReadonlySet<string>;
  selectedKey: string | undefined;
  onSelect: (dateKey: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <View>
      <View style={styles.monthHeader}>
        <MonthArrow direction="prev" onPress={onPrev} />
        <Text style={styles.monthTitle}>{monthTitle(monthKey)}</Text>
        <MonthArrow direction="next" onPress={onNext} />
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      {monthGrid(monthKey).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((cell, index) => {
            if (!cell) return <View key={index} style={styles.day} />;
            const enabled = enabledKeys.has(cell.key);
            const selected = cell.key === selectedKey;
            return (
              <Pressable
                key={cell.key}
                style={styles.day}
                onPress={() => onSelect(cell.key)}
                disabled={!enabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: !enabled }}
                accessibilityLabel={`${cell.day}`}
              >
                <View
                  style={[
                    styles.dayInner,
                    enabled && styles.dayEnabled,
                    selected && styles.daySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !enabled && styles.textDisabled,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MonthArrow({
  direction,
  onPress,
}: {
  direction: 'prev' | 'next';
  onPress?: () => void;
}) {
  const enabled = Boolean(onPress);
  return (
    <Pressable
      style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={
        direction === 'prev' ? 'Mes anterior' : 'Mes siguiente'
      }
      accessibilityState={{ disabled: !enabled }}
    >
      <View style={direction === 'next' && styles.flip}>
        <DriverIcon
          name="back"
          size={18}
          color={enabled ? driverColors.brand : driverColors.border}
        />
      </View>
    </Pressable>
  );
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

/**
 * Rueda de horas: la opción del centro es la elegida. Se puede arrastrar
 * (frena en la más cercana) o tocar una hora.
 */
export function TimeWheel({
  options,
  selectedKey,
  onSelect,
  accessibilityLabel,
}: {
  options: Array<{ key: string; label: string }>;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
  accessibilityLabel: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.key === selectedKey),
  );

  // Centra la elegida cuando cambia desde afuera (otro día, valor sugerido).
  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex, options]);

  function settle(offsetY: number) {
    const index = Math.min(
      options.length - 1,
      Math.max(0, Math.round(offsetY / ITEM_HEIGHT)),
    );
    const option = options[index];
    if (option && option.key !== selectedKey) {
      onSelect(option.key);
    } else {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    }
  }

  function handleEndDrag(event: NativeSyntheticEvent<NativeScrollEvent>) {
    // Sin inercia no llega onMomentumScrollEnd: se fija acá.
    if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.05) {
      settle(event.nativeEvent.contentOffset.y);
    }
  }

  if (options.length === 0) {
    return (
      <Text style={styles.wheelEmpty}>
        No hay horarios disponibles ese día.
      </Text>
    );
  }

  return (
    <View
      style={styles.wheel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
    >
      <View pointerEvents="none" style={styles.wheelHighlight} />
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={styles.wheelContent}
        onLayout={() => {
          scrollRef.current?.scrollTo({
            y: selectedIndex * ITEM_HEIGHT,
            animated: false,
          });
        }}
        onMomentumScrollEnd={(event) => {
          settle(event.nativeEvent.contentOffset.y);
        }}
        onScrollEndDrag={handleEndDrag}
      >
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={option.key}
              style={styles.wheelItem}
              onPress={() => onSelect(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[styles.wheelText, selected && styles.wheelTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: driverColors.border,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    overflow: 'hidden',
  },
  fieldExpanded: { borderColor: driverColors.brand },
  fieldHeader: {
    minHeight: 64,
    paddingHorizontal: driverSpacing.sm,
    paddingVertical: driverSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  fieldCopy: { flex: 1, minWidth: 0 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: driverColors.textMuted,
    textTransform: 'uppercase',
  },
  fieldValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.text,
  },
  fieldTime: {
    minHeight: 40,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.brand,
    fontVariant: ['tabular-nums'],
  },
  fieldBody: {
    paddingHorizontal: driverSpacing.sm,
    paddingBottom: driverSpacing.sm,
    gap: driverSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: driverColors.border,
  },
  monthHeader: {
    marginTop: driverSpacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: driverColors.text,
  },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flip: { transform: [{ rotate: '180deg' }] },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    color: driverColors.textMuted,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEnabled: { backgroundColor: driverColors.brandSoft },
  daySelected: { backgroundColor: driverColors.brand },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: driverColors.text,
  },
  dayTextSelected: { color: driverColors.surface, fontWeight: '700' },
  textDisabled: { color: driverColors.disabled },
  wheel: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    justifyContent: 'center',
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * PADDING_ITEMS,
    height: ITEM_HEIGHT,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
    borderWidth: 1,
    borderColor: driverColors.brand,
  },
  wheelContent: { paddingVertical: ITEM_HEIGHT * PADDING_ITEMS },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    fontSize: 18,
    color: driverColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  wheelTextSelected: {
    fontSize: 22,
    fontWeight: '700',
    color: driverColors.brand,
  },
  wheelEmpty: {
    paddingVertical: driverSpacing.sm,
    textAlign: 'center',
    color: driverColors.textMuted,
  },
  pressed: { opacity: 0.7 },
});
