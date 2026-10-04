import type { Booking } from './mock';

export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 30_000;

type Options = {
  fetchOnce: () => Promise<Booking>;
  /** Corta apenas el estado deja de estar "esperando pago". */
  isSettled: (booking: Booking) => boolean;
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Inyectables para los tests. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onUpdate?: (booking: Booking) => void;
};

export type PollResult = {
  booking: Booking | null;
  /** `settled`: el backend ya definió el estado. `timeout`: se agotó la espera. */
  outcome: 'settled' | 'timeout' | 'aborted';
};

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Pregunta por la reserva cada `intervalMs` hasta `timeoutMs`. Un error de red
 * no corta la espera: el pago puede estar confirmándose igual.
 */
export async function pollReservation({
  fetchOnce,
  isSettled,
  intervalMs = POLL_INTERVAL_MS,
  timeoutMs = POLL_TIMEOUT_MS,
  signal,
  sleep = realSleep,
  now = Date.now,
  onUpdate,
}: Options): Promise<PollResult> {
  const startedAt = now();
  let last: Booking | null = null;
  for (;;) {
    if (signal?.aborted) return { booking: last, outcome: 'aborted' };
    try {
      last = await fetchOnce();
      onUpdate?.(last);
      if (isSettled(last)) return { booking: last, outcome: 'settled' };
    } catch {
      // Se reintenta en el próximo ciclo.
    }
    if (now() - startedAt >= timeoutMs) {
      return { booking: last, outcome: 'timeout' };
    }
    await sleep(intervalMs);
  }
}
