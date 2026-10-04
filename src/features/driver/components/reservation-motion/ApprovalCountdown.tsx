import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  approvalCountdown,
  approvalRemainingMs,
} from '../../reservationMotion';
import { ticketColors } from '../../theme';

/** Hora del dispositivo, una vez por segundo mientras `active`. */
export function useSecondTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [active]);
  return now;
}

type Props = {
  approvalDeadlineAt: string | null;
  /** Avisa una vez cuando llega a cero (para consultar ya al servidor). */
  onReachZero?: () => void;
};

/**
 * Talón de la reserva pendiente: "Quedan 14:59 para que confirme". Si llega a
 * cero antes de que el servidor cambie el estado, no da la reserva por
 * vencida: "Estamos confirmando…" hasta tener la respuesta.
 */
export function ApprovalCountdown({ approvalDeadlineAt, onReachZero }: Props) {
  const now = useSecondTick(true);
  const countdown = approvalCountdown(
    approvalRemainingMs(approvalDeadlineAt, now),
  );
  const atZero = countdown.kind === 'confirming';

  useEffect(() => {
    if (atZero) onReachZero?.();
  }, [atZero]);

  if (countdown.kind === 'confirming') {
    return (
      <View
        accessible
        accessibilityLabel="Estamos confirmando con el estacionamiento"
      >
        <Text style={styles.title}>Estamos confirmando…</Text>
        <Text style={styles.caption}>Ya casi está</Text>
      </View>
    );
  }
  const [minutes, seconds] = countdown.label.split(':').map(Number);
  return (
    <View
      accessible
      accessibilityLabel={`Quedan ${minutes} minutos y ${seconds} segundos para que confirme`}
    >
      <Text style={styles.title}>
        Quedan <Text style={styles.clock}>{countdown.label}</Text>
      </Text>
      <Text style={styles.caption}>para que confirme</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: ticketColors.ink,
    letterSpacing: -0.1,
  },
  clock: { fontVariant: ['tabular-nums'] },
  caption: {
    marginTop: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: ticketColors.label,
  },
});
