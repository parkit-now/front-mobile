import { StyleSheet, Text, View } from 'react-native';
import type { Tone } from '../reservationStatus';
import { driverColors, driverRadius, driverSpacing } from '../theme';

export const toneColors: Record<Tone, { text: string; surface: string }> = {
  ok: { text: driverColors.success, surface: driverColors.successSurface },
  warn: { text: driverColors.warning, surface: driverColors.warningSurface },
  err: { text: driverColors.danger, surface: driverColors.dangerSurface },
  brand: { text: driverColors.brand, surface: '#e8f0fd' },
  muted: { text: driverColors.textMuted, surface: '#f2f4f7' },
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const colors = toneColors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface }]}>
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: driverSpacing.xs,
    paddingVertical: 5,
    borderRadius: driverRadius.chip,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
