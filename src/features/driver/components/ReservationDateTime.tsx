import { useEffect, useRef, type ReactNode } from 'react';
import {
  Platform,
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
import { Popover } from './FloatingLayer';
import { Chevron } from './FloatingSelect';

// Piezas del selector de ingreso / egreso del modal de reserva: un campo con
// dos desplegables (día y hora), un calendario mensual y una rueda de horas.
// Todo en JS (sin date pickers nativos) para respetar las reglas de la
// reserva: sólo días y horas dentro del horario de apertura y de los próximos
// 7 días. Los paneles flotan sobre el modal (ver FloatingLayer): abrirlos no
// cambia el alto del campo ni mueve lo de abajo.

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export type MomentPart = 'date' | 'time';

/** Ancho mínimo del calendario: 7 días de 40 px tocables. */
const CALENDAR_MIN_WIDTH = 280;
const TIME_PANEL_WIDTH = 168;

export function MomentField({
  label,
  dateText,
  timeText,
  openPart,
  disabled = false,
  onOpen,
  onClose,
  datePanel,
  timePanel,
  testID,
}: {
  label: string;
  dateText: string;
  timeText: string;
  /** Qué desplegable está abierto (o ninguno). */
  openPart: MomentPart | null;
  disabled?: boolean;
  onOpen: (part: MomentPart) => void;
  onClose: () => void;
  /** Calendario: se dibuja en un panel flotante debajo (o arriba) del campo. */
  datePanel: ReactNode;
  /** Rueda de horas: panel angosto alineado con la hora. */
  timePanel: ReactNode;
  testID?: string;
}) {
  const anchorRef = useRef<View>(null);
  const lower = label.toLocaleLowerCase('es-AR');
  const dateOpen = openPart === 'date';
  const timeOpen = openPart === 'time';

  return (
    <View
      ref={anchorRef}
      collapsable={false}
      style={[styles.field, openPart && styles.fieldOpen]}
      testID={testID}
    >
      <Pressable
        style={({ pressed }) => [styles.fieldDate, pressed && styles.pressed]}
        onPress={() => {
          if (dateOpen) onClose();
          else onOpen('date');
        }}
        disabled={disabled}
        role="combobox"
        aria-expanded={dateOpen}
        aria-disabled={disabled}
        accessibilityLabel={`Día de ${lower}: ${dateText}`}
        accessibilityHint="Abre el calendario"
        testID={testID ? `${testID}-date` : undefined}
      >
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.fieldValueRow}>
          <Text
            style={[
              styles.fieldValue,
              dateOpen && styles.fieldValueOpen,
              disabled && styles.textDisabled,
            ]}
            numberOfLines={1}
          >
            {dateText}
          </Text>
          <Chevron
            open={dateOpen}
            size={16}
            color={disabled ? driverColors.disabled : driverColors.textMuted}
          />
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.fieldTime,
          timeOpen && styles.fieldTimeOpen,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          if (timeOpen) onClose();
          else onOpen('time');
        }}
        disabled={disabled}
        role="combobox"
        aria-expanded={timeOpen}
        aria-disabled={disabled}
        accessibilityLabel={`Hora de ${lower}: ${timeText}`}
        accessibilityHint="Abre la rueda de horas"
        testID={testID ? `${testID}-time` : undefined}
      >
        <DriverIcon
          name="clock"
          size={16}
          color={disabled ? driverColors.disabled : driverColors.brand}
        />
        <Text style={[styles.fieldTimeText, disabled && styles.textDisabled]}>
          {timeText}
        </Text>
      </Pressable>

      <Popover
        open={dateOpen}
        onClose={onClose}
        anchorRef={anchorRef}
        minWidth={CALENDAR_MIN_WIDTH}
        maxHeight={420}
        accessibilityLabel={`Calendario de ${lower}`}
        testID={testID ? `${testID}-date-panel` : undefined}
      >
        <View style={styles.panelBody}>{datePanel}</View>
      </Popover>
      <Popover
        open={timeOpen}
        onClose={onClose}
        anchorRef={anchorRef}
        width={TIME_PANEL_WIDTH}
        align="end"
        maxHeight={320}
        accessibilityLabel={`Horas de ${lower}`}
        testID={testID ? `${testID}-time-panel` : undefined}
      >
        <View style={styles.panelBody}>{timePanel}</View>
      </Popover>
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
                aria-selected={selected}
                aria-disabled={!enabled}
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

/**
 * Rueda de horas: la opción del centro es la elegida. Se puede arrastrar
 * (frena en la más cercana) o tocar una hora; tocar además llama a `onPick`
 * (el panel flotante se cierra con una elección explícita).
 */
export function TimeWheel({
  options,
  selectedKey,
  onSelect,
  onPick,
  visibleItems = 3,
  accessibilityLabel,
}: {
  options: Array<{ key: string; label: string }>;
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
  onPick?: (key: string) => void;
  /** Filas visibles (impar: la del medio es la elegida). */
  visibleItems?: number;
  accessibilityLabel: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const paddingItems = Math.floor(visibleItems / 2);
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

  // En web (rueda del mouse, trackpad) no llegan los eventos de fin de
  // arrastre ni de inercia: se fija la hora cuando el scroll se detiene.
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      clearTimeout(idleTimer.current);
    },
    [],
  );
  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (Platform.OS !== 'web') return;
    const offsetY = event.nativeEvent.contentOffset.y;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      settle(offsetY);
    }, 140);
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
      style={[styles.wheel, { height: ITEM_HEIGHT * visibleItems }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
    >
      <View
        style={[
          styles.wheelHighlight,
          { top: ITEM_HEIGHT * paddingItems, pointerEvents: 'none' },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * paddingItems }}
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
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {options.map((option, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={option.key}
              style={styles.wheelItem}
              onPress={() => {
                if (option.key !== selectedKey) onSelect(option.key);
                onPick?.(option.key);
              }}
              accessibilityRole="button"
              aria-selected={selected}
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
    height: 64,
    paddingLeft: driverSpacing.sm,
    paddingRight: driverSpacing.xs,
    borderWidth: 1,
    borderColor: driverColors.border,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.xs,
  },
  fieldOpen: { borderColor: driverColors.brand },
  fieldDate: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: driverColors.textMuted,
    textTransform: 'uppercase',
  },
  fieldValueRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fieldValue: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.text,
  },
  fieldValueOpen: { color: driverColors.brand },
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
  fieldTimeOpen: { borderColor: driverColors.brand },
  fieldTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: driverColors.brand,
    fontVariant: ['tabular-nums'],
  },
  panelBody: { padding: driverSpacing.xs },
  monthHeader: {
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
    justifyContent: 'center',
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: driverRadius.chip,
    backgroundColor: driverColors.brandSoft,
    borderWidth: 1,
    borderColor: driverColors.brand,
  },
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
