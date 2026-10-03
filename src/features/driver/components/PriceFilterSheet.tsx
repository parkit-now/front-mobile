import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { priceAtPosition, type PriceSliderBounds } from '../selectors';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { OverlaySheet } from './OverlaySheet';

type Props = {
  // null = todas las cocheras cuestan lo mismo: no hay nada que filtrar.
  bounds: PriceSliderBounds | null;
  // Precios de las cocheras candidatas (ya filtradas por vehículo y
  // disponibilidad), para contar en vivo y marcar la barra.
  prices: number[];
  selected: number | null;
  onApply: (maxHourlyPriceArs: number | null) => void;
  onClose: () => void;
};

const THUMB_SIZE = 28;

export function PriceFilterSheet({
  bounds,
  prices,
  selected,
  onApply,
  onClose,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [value, setValue] = useState(
    () => selected ?? bounds?.max ?? Number.POSITIVE_INFINITY,
  );
  const matches = prices.filter((price) => price <= value).length;
  const isAnyPrice = bounds === null || value >= bounds.max;

  function moveTo(position: number) {
    if (bounds) setValue(priceAtPosition(position, trackWidth, bounds));
  }

  // Tocar o arrastrar en cualquier punto de la barra mueve el control.
  // runOnJS: la lógica es liviana y así vive en React, sin worklets.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((event) => {
      moveTo(event.x);
    })
    .onUpdate((event) => {
      moveTo(event.x);
    });

  const ratio =
    bounds && Number.isFinite(value)
      ? (Math.min(value, bounds.max) - bounds.min) / (bounds.max - bounds.min)
      : 1;

  return (
    <OverlaySheet title="Precio máximo por hora" onClose={onClose}>
      {bounds ? (
        <>
          <View style={styles.valueRow}>
            <Text style={styles.value}>
              {isAnyPrice ? 'Cualquier precio' : `Hasta ${formatArs(value)}`}
            </Text>
            <Text style={styles.matches}>
              {matches} de {prices.length}{' '}
              {prices.length === 1 ? 'cochera' : 'cocheras'}
            </Text>
          </View>

          <GestureDetector gesture={pan}>
            <View
              style={styles.trackArea}
              onLayout={(event) => {
                setTrackWidth(event.nativeEvent.layout.width);
              }}
              accessibilityRole="adjustable"
              accessibilityLabel="Precio máximo por hora"
              accessibilityValue={{
                min: bounds.min,
                max: bounds.max,
                now: Math.min(value, bounds.max),
                text: isAnyPrice
                  ? 'Cualquier precio'
                  : `Hasta ${formatArs(value)}`,
              }}
              accessibilityActions={[
                { name: 'increment' },
                { name: 'decrement' },
              ]}
              onAccessibilityAction={(event) => {
                const delta =
                  event.nativeEvent.actionName === 'increment'
                    ? bounds.step
                    : -bounds.step;
                setValue((current) =>
                  Math.min(
                    Math.max(Math.min(current, bounds.max) + delta, bounds.min),
                    bounds.max,
                  ),
                );
              }}
            >
              <View style={styles.track} />
              <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
              {/* Una marca por cochera: se ve dónde se concentran los
                    precios, como el histograma de Airbnb pero a escala. */}
              {prices.map((price, index) => (
                <View
                  key={`${price}-${index}`}
                  style={[
                    styles.tick,
                    price <= value && styles.tickOn,
                    {
                      left:
                        ((price - bounds.min) / (bounds.max - bounds.min)) *
                          trackWidth -
                        2,
                    },
                  ]}
                />
              ))}
              <View
                style={[
                  styles.thumb,
                  { left: ratio * trackWidth - THUMB_SIZE / 2 },
                ]}
              />
            </View>
          </GestureDetector>

          <View style={styles.boundsRow}>
            <Text style={styles.boundText}>{formatArs(bounds.min)}</Text>
            <Text style={styles.boundText}>{formatArs(bounds.max)}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.hint}>
          Las cocheras de esta zona tienen el mismo precio: no hay nada para
          filtrar.
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            onApply(null);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Limpiar</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            matches === 0 && styles.primaryButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            onApply(isAnyPrice ? null : value);
          }}
          disabled={matches === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: matches === 0 }}
        >
          <Text style={styles.primaryText}>
            {matches === 0
              ? 'Sin cocheras'
              : `Ver ${matches} ${matches === 1 ? 'cochera' : 'cocheras'}`}
          </Text>
        </Pressable>
      </View>
    </OverlaySheet>
  );
}

export function formatArs(value: number): string {
  return `$${value.toLocaleString('es-AR')}`;
}

const styles = StyleSheet.create({
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: driverSpacing.sm,
  },
  value: {
    color: driverColors.brand,
    fontSize: 22,
    fontWeight: '700',
  },
  matches: {
    color: driverColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  trackArea: {
    height: 44,
    marginHorizontal: THUMB_SIZE / 2,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: driverColors.border,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: driverColors.brand,
  },
  tick: {
    position: 'absolute',
    top: 8,
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: driverColors.disabled,
  },
  tickOn: {
    backgroundColor: driverColors.brandStrong,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    borderColor: driverColors.brand,
    backgroundColor: driverColors.surface,
    shadowColor: driverColors.text,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  boundsRow: {
    marginHorizontal: THUMB_SIZE / 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  boundText: {
    color: driverColors.textMuted,
    fontSize: 12,
  },
  hint: {
    color: driverColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    marginTop: driverSpacing.xs,
    flexDirection: 'row',
    gap: driverSpacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 2,
    minHeight: 48,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: driverColors.disabled,
  },
  secondaryText: {
    color: driverColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryText: {
    color: driverColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
