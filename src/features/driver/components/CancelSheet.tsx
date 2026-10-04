import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { translateApiError } from '../../../lib/api/translate';
import { useDriverData } from '../hooks/useDriverData';
import type { Booking } from '../mock';
import {
  cancelPreviewCopy,
  type CancelPreviewCopy,
} from '../reservationStatus';
import { driverColors, driverRadius, driverSpacing } from '../theme';
import { OverlaySheet } from './OverlaySheet';
import { toneColors } from './StatusPill';

type Props = {
  booking: Booking;
  onClose: () => void;
  /** La reserva ya quedó cancelada en el backend. */
  onCancelled: (booking: Booking) => void;
};

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; copy: CancelPreviewCopy };

/**
 * Hoja de cancelación: primero pregunta al backend cuánto se devolvería
 * (GET …/cancel-preview) y sólo después deja confirmar (POST …/cancel).
 */
export function CancelSheet({ booking, onClose, onCancelled }: Props) {
  const { previewCancel, cancelReservation } = useDriverData();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // La hoja se puede cerrar con el pedido en vuelo: el resultado se ignora sin
  // tocar estado de un componente desmontado.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setState({ kind: 'loading' });
    void previewCancel(booking.id)
      .then((preview) => {
        if (!active) return;
        setState({ kind: 'ready', copy: cancelPreviewCopy(preview, booking) });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setState({
          kind: 'error',
          message: translateApiError(cause, {
            endpoint: 'driver.cancelPreview',
          }),
        });
      });
    return () => {
      active = false;
    };
  }, [booking.id, previewCancel, retryKey]);

  async function confirm() {
    setCancelling(true);
    setError(null);
    try {
      const cancelled = await cancelReservation(booking.id);
      // Aunque la hoja ya se haya cerrado, el padre tiene que enterarse.
      onCancelled(cancelled);
    } catch (cause) {
      if (mounted.current) {
        setError(
          translateApiError(cause, { endpoint: 'driver.cancelReservation' }),
        );
      }
    } finally {
      if (mounted.current) setCancelling(false);
    }
  }

  return (
    <OverlaySheet title="¿Cancelar la reserva?" onClose={onClose}>
      <Text style={styles.parking}>
        {booking.parkingName} · {booking.entry.dateLabel},{' '}
        {booking.entry.timeLabel}
      </Text>

      {state.kind === 'loading' ? (
        <View style={styles.box}>
          <ActivityIndicator color={driverColors.brand} />
          <Text style={styles.muted}>Calculando tu reembolso…</Text>
        </View>
      ) : state.kind === 'error' ? (
        <View style={styles.box}>
          <Text style={styles.errorText}>{state.message}</Text>
          <Pressable
            onPress={() => {
              setRetryKey((key) => key + 1);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {state.copy.intro ? (
            <Text style={styles.intro}>{state.copy.intro}</Text>
          ) : null}
          <View style={styles.refundBox}>
            <Text style={styles.refundLabel}>Reembolso</Text>
            <Text
              style={[
                styles.refundValue,
                { color: toneColors[state.copy.tone].text },
              ]}
              accessibilityRole="text"
            >
              {state.copy.refund}
            </Text>
          </View>
        </>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {state.kind === 'ready' && state.copy.canConfirm ? (
        <Pressable
          style={({ pressed }) => [
            styles.destructive,
            (cancelling || pressed) && styles.pressed,
          ]}
          onPress={() => {
            void confirm();
          }}
          disabled={cancelling}
          accessibilityRole="button"
          accessibilityState={{ busy: cancelling, disabled: cancelling }}
        >
          <Text style={styles.destructiveText}>
            {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Volver</Text>
      </Pressable>
    </OverlaySheet>
  );
}

const styles = StyleSheet.create({
  parking: { fontSize: 14, color: driverColors.textSecondary },
  intro: { fontSize: 14, lineHeight: 20, color: driverColors.textSecondary },
  box: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: driverSpacing.xs,
  },
  muted: { fontSize: 13, color: driverColors.textMuted },
  refundBox: {
    padding: driverSpacing.sm,
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.brandSoft,
    borderWidth: 1,
    borderColor: driverColors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: driverSpacing.sm,
  },
  refundLabel: { fontSize: 13, color: driverColors.textMuted },
  refundValue: { flexShrink: 1, fontSize: 16, fontWeight: '800' },
  errorText: { fontSize: 14, color: driverColors.danger, textAlign: 'center' },
  link: { color: driverColors.brand, fontWeight: '700', fontSize: 15 },
  destructive: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.danger,
    backgroundColor: driverColors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveText: {
    color: driverColors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    minHeight: 48,
    borderRadius: driverRadius.control,
    borderWidth: 1,
    borderColor: driverColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: driverColors.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.8 },
});
