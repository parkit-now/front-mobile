import type { Booking } from './mock';
import {
  clockLabel,
  formatArs,
  type ReservationPhase,
} from './reservationStatus';

// Lógica pura de la pantalla de la reserva "en movimiento": qué etapa se ve,
// qué animación toca al pasar de una a otra, la cuenta regresiva de la
// aprobación y el ritmo de la consulta al servidor. Los componentes animados
// viven en components/reservation-motion/.

/**
 * Etapa visual de la pantalla de la reserva.
 * - `paying`: todavía no hay respuesta del pago (esperando o confirmando).
 * - `pending`: pagó y falta que el estacionamiento acepte.
 * - `confirmed`: tiene su lugar (confirmada o en curso).
 * - `rejected`: el estacionamiento la rechazó o no respondió a tiempo.
 */
export type OutcomeStage = 'paying' | 'pending' | 'confirmed' | 'rejected';

/** Coreografía a correr al entrar en una etapa. `still`: se muestra quieta. */
export type MotionKind =
  | 'still'
  | 'celebrate'
  | 'payToPending'
  | 'accept'
  | 'reject';

export function outcomeStage(
  phase: ReservationPhase | null,
  confirming: boolean,
): OutcomeStage | null {
  if (confirming) return 'paying';
  switch (phase) {
    case 'awaiting_payment':
    case 'payment_rejected':
      return 'paying';
    case 'awaiting_approval':
      return 'pending';
    case 'confirmed':
    case 'in_progress':
      return 'confirmed';
    case 'rejected':
      return 'rejected';
    default:
      return null;
  }
}

/**
 * Qué animación corresponde al pasar de `prev` (lo último que se vio en esta
 * pantalla) a `next`. Si la persona abre una reserva que ya está confirmada o
 * rechazada (`prev` null), se muestra quieta: no hay festejo de algo viejo.
 */
export function decideMotion(
  prev: OutcomeStage | null,
  next: OutcomeStage | null,
): MotionKind {
  if (prev === next || next === null) return 'still';
  if (prev === 'paying') {
    if (next === 'confirmed') return 'celebrate';
    if (next === 'pending') return 'payToPending';
    return 'still';
  }
  if (prev === 'pending') {
    if (next === 'confirmed') return 'accept';
    if (next === 'rejected') return 'reject';
  }
  return 'still';
}

/** Vibración que acompaña cada coreografía (ninguna en el rechazo). */
export function motionHaptic(kind: MotionKind): 'success' | 'light' | null {
  switch (kind) {
    case 'celebrate':
    case 'accept':
      return 'success';
    case 'payToPending':
      return 'light';
    default:
      return null;
  }
}

// ─── Aprobación: plazo, anillo y cuenta regresiva ───────────────────────────

/**
 * Milisegundos que le quedan al estacionamiento para responder. `nowMs` es la
 * hora del dispositivo (la app no tiene todavía un desfase con el reloj del
 * servidor; si lo tuviera, se le suma acá).
 */
export function approvalRemainingMs(
  deadlineAt: string | null,
  nowMs: number,
): number {
  if (deadlineAt === null) return 0;
  return Math.max(0, new Date(deadlineAt).getTime() - nowMs);
}

/** Fracción del plazo que queda (1 recién pagado, 0 vencido): el anillo. */
export function approvalProgress(
  deadlineAt: string | null,
  windowMinutes: number,
  nowMs: number,
): number {
  if (deadlineAt === null) return 0;
  const total = Math.max(1, windowMinutes) * 60_000;
  const fraction = approvalRemainingMs(deadlineAt, nowMs) / total;
  return Math.min(1, Math.max(0, fraction));
}

export type ApprovalCountdown =
  | { kind: 'counting'; label: string }
  /** Llegó a cero pero el servidor todavía no cambió el estado. */
  | { kind: 'confirming' };

/** "14:59" redondeando para arriba, como un temporizador. */
export function approvalCountdown(remainingMs: number): ApprovalCountdown {
  if (remainingMs <= 0) return { kind: 'confirming' };
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    kind: 'counting',
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}

export const APPROVAL_POLL_MS = 5_000;
export const APPROVAL_POLL_SLOW_MS = 10_000;
export const APPROVAL_POLL_SLOWDOWN_AFTER_MS = 2 * 60_000;

/** Ritmo tranquilo: cada 5 s y, pasados 2 min mirando, cada 10 s. */
export function approvalPollDelay(elapsedMs: number): number {
  return elapsedMs >= APPROVAL_POLL_SLOWDOWN_AFTER_MS
    ? APPROVAL_POLL_SLOW_MS
    : APPROVAL_POLL_MS;
}

// ─── Rechazo ────────────────────────────────────────────────────────────────

/** `no_response`: venció el plazo sin que el estacionamiento contestara. */
export function rejectionVariant(
  booking: Pick<Booking, 'reason'>,
): 'rejected' | 'no_response' {
  return booking.reason === 'approval_timeout' ? 'no_response' : 'rejected';
}

// ─── Textos ─────────────────────────────────────────────────────────────────

/** "sáb 3 oct · 20:30 – 21:00" (o con las dos fechas si cambia el día). */
export function whenLabel(booking: Pick<Booking, 'entry' | 'exit'>): string {
  // Hermes a veces agrega puntos ("sáb., 3 oct."): se quitan con las comas.
  const day = (label: string) => label.replace(/[.,]/g, '');
  if (booking.entry.dateLabel === booking.exit.dateLabel) {
    return `${day(booking.entry.dateLabel)} · ${booking.entry.timeLabel} – ${booking.exit.timeLabel}`;
  }
  return `${day(booking.entry.dateLabel)} ${booking.entry.timeLabel} – ${day(booking.exit.dateLabel)} ${booking.exit.timeLabel}`;
}

/** Lo que se anuncia al lector de pantalla cuando cambia la etapa. */
export function stageAnnouncement(
  stage: OutcomeStage,
  booking: Pick<Booking, 'parkingName' | 'totalArs' | 'reason'>,
): string | null {
  const amount = `${formatArs(booking.totalArs)}`;
  switch (stage) {
    case 'pending':
      return `Solicitud enviada. Pagaste ${amount} y falta que ${booking.parkingName} confirme tu lugar.`;
    case 'confirmed':
      return `Reserva confirmada. Tenés tu lugar en ${booking.parkingName}.`;
    case 'rejected':
      return rejectionVariant(booking) === 'no_response'
        ? `${booking.parkingName} no respondió a tiempo. Te devolvemos ${amount} a tu Mercado Pago.`
        : `${booking.parkingName} rechazó la reserva. Te devolvemos ${amount} a tu Mercado Pago.`;
    default:
      return null;
  }
}

/** "20:45" del plazo de aprobación, o null si no hay plazo. */
export function deadlineClock(deadlineAt: string | null): string | null {
  return deadlineAt === null ? null : clockLabel(new Date(deadlineAt));
}

// ─── Resortes ───────────────────────────────────────────────────────────────

export type SpringParams = {
  stiffness: number;
  damping: number;
  mass: number;
};

/**
 * Resorte físico equivalente a las curvas del prototipo: un oscilador con
 * amortiguamiento `zeta` que se asienta en `durationMs` (ω = 7,5 / ζ sobre el
 * tiempo normalizado). Con masa 1: rigidez ω² y amortiguamiento 2ζω.
 */
export function springFor(durationMs: number, zeta: number): SpringParams {
  const omega = 7.5 / (zeta * (durationMs / 1000));
  return {
    stiffness: Math.round(omega * omega * 10) / 10,
    damping: Math.round(2 * zeta * omega * 100) / 100,
    mass: 1,
  };
}
