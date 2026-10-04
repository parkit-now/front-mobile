import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { DriverIcon, type DriverIconName } from './DriverIcon';
import { Popover } from './FloatingLayer';

export type FloatingSelectOption<T extends string> = {
  value: T;
  label: string;
  icon?: DriverIconName;
  disabled?: boolean;
};

type Props<T extends string> = {
  /** Nombre del campo para lectores de pantalla ("Tipo"). */
  label: string;
  value: T | null;
  options: readonly FloatingSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  maxHeight?: number;
  testID?: string;
};

/**
 * Desplegable de una sola opción: el campo mantiene su alto y las opciones
 * flotan en un panel anclado a él (ver FloatingLayer). Requiere un
 * FloatingLayerHost arriba en el árbol.
 */
export function FloatingSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Elegí una opción',
  disabled = false,
  invalid = false,
  maxHeight = 320,
  testID,
}: Props<T>) {
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <>
      <Pressable
        ref={anchorRef}
        testID={testID}
        style={({ pressed }) => [
          styles.field,
          open && styles.fieldOpen,
          invalid && styles.fieldInvalid,
          disabled && styles.fieldDisabled,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          setOpen((current) => !current);
        }}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-disabled={disabled}
        accessibilityLabel={`${label}: ${selected?.label ?? 'sin elegir'}`}
        accessibilityHint="Abre la lista de opciones"
      >
        {selected?.icon ? (
          <DriverIcon
            name={selected.icon}
            size={20}
            color={driverColors.brand}
          />
        ) : null}
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Chevron open={open} />
      </Pressable>

      <Popover
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        anchorRef={anchorRef}
        maxHeight={maxHeight}
        accessibilityLabel={`Opciones de ${label.toLocaleLowerCase('es-AR')}`}
        testID={testID ? `${testID}-panel` : undefined}
      >
        <View style={styles.options} accessibilityRole="radiogroup">
          {options.map((option) => {
            const isSelected = option.value === selected?.value;
            return (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                disabled={option.disabled}
                accessibilityRole="radio"
                aria-checked={isSelected}
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                accessibilityLabel={option.label}
              >
                {option.icon ? (
                  <DriverIcon
                    name={option.icon}
                    size={20}
                    color={
                      option.disabled
                        ? driverColors.disabled
                        : isSelected
                          ? driverColors.brand
                          : driverColors.textSecondary
                    }
                  />
                ) : null}
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    option.disabled && styles.optionTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                <View style={styles.check}>
                  {isSelected ? (
                    <DriverIcon
                      name="check"
                      size={18}
                      color={driverColors.brand}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Popover>
    </>
  );
}

/** Flecha del desplegable: gira media vuelta al abrir. */
export function Chevron({
  open,
  color = driverColors.textSecondary,
  size = 20,
}: {
  open: boolean;
  color?: string;
  size?: number;
}) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, {
      duration: reduceMotion ? 0 : 180,
    });
  }, [open, reduceMotion, turn]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <DriverIcon name="chevron-down" size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 48,
    paddingHorizontal: driverSpacing.sm,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  fieldOpen: {
    borderColor: driverColors.brand,
    backgroundColor: driverColors.brandSoft,
  },
  fieldInvalid: {
    borderColor: driverColors.danger,
    backgroundColor: driverColors.dangerSurface,
  },
  fieldDisabled: { opacity: 0.45 },
  value: {
    flex: 1,
    minWidth: 0,
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  placeholder: { color: driverColors.disabled, fontWeight: '400' },
  options: { paddingVertical: 6 },
  option: {
    minHeight: 48,
    marginHorizontal: 6,
    paddingHorizontal: driverSpacing.sm - 2,
    borderRadius: driverRadius.chip,
    flexDirection: 'row',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  optionSelected: { backgroundColor: driverColors.brandSoft },
  optionPressed: { backgroundColor: driverColors.background },
  optionText: {
    flex: 1,
    minWidth: 0,
    color: driverColors.text,
    fontSize: 15,
  },
  optionTextSelected: { color: driverColors.brand, fontWeight: '700' },
  optionTextDisabled: { color: driverColors.disabled },
  check: { width: 18, alignItems: 'center' },
  pressed: { opacity: 0.8 },
});
