import { StyleSheet, Text, View } from 'react-native';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import type { MapPanelProps } from './MapPanel.types';

export function MapPanel({ parkingLots }: MapPanelProps) {
  return (
    <View style={styles.stage} accessibilityLabel="Mapa de estacionamientos">
      <Text style={styles.title}>Mapa disponible en Android y iOS</Text>
      <Text style={styles.copy}>
        {parkingLots.length === 1
          ? 'Hay 1 estacionamiento en esta búsqueda.'
          : `Hay ${parkingLots.length} estacionamientos en esta búsqueda.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 470,
    padding: driverSpacing.lg,
    borderRadius: driverRadius.card,
    borderWidth: 1,
    borderColor: driverColors.border,
    backgroundColor: driverColors.mapBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: driverColors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  copy: {
    marginTop: driverSpacing.xs,
    color: driverColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
