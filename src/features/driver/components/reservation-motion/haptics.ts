import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticKind = 'success' | 'light';

/**
 * Vibración de la reserva: éxito al confirmar, toque suave al aprobarse el
 * pago de una que espera al estacionamiento. En la web no hace nada, y si el
 * dispositivo no vibra se ignora.
 */
export function fireHaptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  try {
    const pending =
      kind === 'success'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pending.catch(() => {
      // Sin motor de vibración: no pasa nada.
    });
  } catch {
    // Módulo nativo ausente: no pasa nada.
  }
}
