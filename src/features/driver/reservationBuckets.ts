import type { Booking } from './mock';
import { rejectionVariant } from './reservationMotion';
import {
  clockLabel,
  holdExpired,
  reasonText,
  refundChip,
  reservationPhase,
  type ReservationPhase,
  type Tone,
} from './reservationStatus';

// "Mis reservas" en cuatro pestañas. Todo lo que decide en qué pestaña cae
// cada reserva y cómo se cuenta en su tarjeta vive acá, sin React.

export type ReservationBucket =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export const BUCKETS: readonly ReservationBucket[] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
];

export const BUCKET_LABELS: Record<ReservationBucket, string> = {
  pending: 'Pendientes',
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  cancelled: 'Canceladas',
};

type BucketInput = Pick<
  Booking,
  'lifecycle' | 'status' | 'holdExpiresAt' | 'paymentStatus' | 'cancelledBy'
>;

/**
 * - Pendientes: falta pagar (con el lugar todavía guardado) o falta que el
 *   estacionamiento acepte.
 * - Confirmadas: confirmadas y en curso.
 * - Completadas: completadas y "no te presentaste".
 * - Canceladas: canceladas (por quien sea), rechazadas, vencidas y las que
 *   vencieron sin pago aunque el barrido del backend todavía no las marcó.
 */
export function reservationBucket(
  booking: BucketInput,
  now: Date = new Date(),
): ReservationBucket {
  switch (booking.lifecycle) {
    case 'pending_payment':
      return holdExpired(booking.holdExpiresAt, now) ? 'cancelled' : 'pending';
    case 'pending_approval':
      return 'pending';
    case 'confirmed':
    case 'checked_in':
      // Pasó el egreso y la caja todavía no la cerró: el backend ya la da por
      // terminada.
      return booking.status === 'completed' ? 'completed' : 'confirmed';
    case 'completed':
    case 'no_show':
      return 'completed';
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return 'cancelled';
  }
}

export type BucketedReservations = Record<ReservationBucket, Booking[]>;

/** Reparte y ordena: las que vienen primero arriba; el historial, al revés. */
export function bucketReservations(
  bookings: readonly Booking[],
  now: Date = new Date(),
): BucketedReservations {
  const out: BucketedReservations = {
    pending: [],
    confirmed: [],
    completed: [],
    cancelled: [],
  };
  for (const booking of bookings) {
    out[reservationBucket(booking, now)].push(booking);
  }
  for (const bucket of BUCKETS) sortBucket(bucket, out[bucket]);
  return out;
}

const soonest = (a: Booking, b: Booking) => a.entryAt.localeCompare(b.entryAt);
const latest = (a: Booking, b: Booking) => b.entryAt.localeCompare(a.entryAt);

/** Ordena en el lugar: las que vienen primero arriba; el historial, al revés. */
export function sortBucket(bucket: ReservationBucket, list: Booking[]): void {
  switch (bucket) {
    case 'pending':
      list.sort(soonest);
      return;
    case 'confirmed':
      // En curso primero: es la que está usando ahora.
      list.sort((a, b) => {
        const live =
          Number(b.lifecycle === 'checked_in') -
          Number(a.lifecycle === 'checked_in');
        return live !== 0 ? live : soonest(a, b);
      });
      return;
    case 'completed':
    case 'cancelled':
      list.sort(latest);
  }
}

/**
 * Deja cada reserva de `lingering` en la pestaña donde estaba (ya con su
 * estado nuevo) un momento antes de que se vaya: primero cambia donde está,
 * después se va. Nunca desaparece sin explicación.
 */
export function withLingering(
  buckets: BucketedReservations,
  lingering: Readonly<Record<string, ReservationBucket>>,
): BucketedReservations {
  const ids = Object.keys(lingering);
  if (ids.length === 0) return buckets;
  const out: BucketedReservations = {
    pending: [],
    confirmed: [],
    completed: [],
    cancelled: [],
  };
  const moved: Booking[] = [];
  for (const bucket of BUCKETS) {
    for (const booking of buckets[bucket]) {
      const stay = lingering[booking.id];
      if (stay && stay !== bucket) moved.push(booking);
      else out[bucket].push(booking);
    }
  }
  for (const booking of moved) out[lingering[booking.id]].push(booking);
  for (const bucket of BUCKETS) sortBucket(bucket, out[bucket]);
  return out;
}

/** Reservas que cambiaron de pestaña desde la última vez. */
export function bucketMoves(
  previous: ReadonlyMap<string, ReservationBucket>,
  buckets: BucketedReservations,
): Array<{ id: string; from: ReservationBucket; to: ReservationBucket }> {
  const moves: Array<{
    id: string;
    from: ReservationBucket;
    to: ReservationBucket;
  }> = [];
  for (const bucket of BUCKETS) {
    for (const booking of buckets[bucket]) {
      const from = previous.get(booking.id);
      if (from && from !== bucket)
        moves.push({ id: booking.id, from, to: bucket });
    }
  }
  return moves;
}

export function bucketIndex(
  buckets: BucketedReservations,
): Map<string, ReservationBucket> {
  const index = new Map<string, ReservationBucket>();
  for (const bucket of BUCKETS) {
    for (const booking of buckets[bucket]) index.set(booking.id, bucket);
  }
  return index;
}

export function bucketCounts(
  buckets: BucketedReservations,
): Record<ReservationBucket, number> {
  return {
    pending: buckets.pending.length,
    confirmed: buckets.confirmed.length,
    completed: buckets.completed.length,
    cancelled: buckets.cancelled.length,
  };
}

/** Pendientes si hay algo esperando; si no, Confirmadas. */
export function defaultBucket(
  counts: Record<ReservationBucket, number>,
): ReservationBucket {
  return counts.pending > 0 ? 'pending' : 'confirmed';
}

/** +1 si la pestaña nueva está a la derecha (las tarjetas entran desde ahí). */
export function tabDirection(
  from: ReservationBucket,
  to: ReservationBucket,
): 1 | -1 {
  return BUCKETS.indexOf(to) >= BUCKETS.indexOf(from) ? 1 : -1;
}

// ─── Tarjeta ────────────────────────────────────────────────────────────────

export type ChipTone = 'amber' | 'blue' | 'green' | 'slate' | 'rose' | 'refund';

export type CardChip = {
  label: string;
  tone: ChipTone;
  /** `live`: punto verde de "en curso". `refund`: flecha de devolución. */
  lead?: 'live' | 'refund';
};

/**
 * Dibujo del lugar con el autito: afuera esperando (ámbar), adentro (azul),
 * gris (pasada) o lugar punteado vacío (cancelada).
 */
export type SlotGlyph = 'wait' | 'in' | 'done' | 'empty';

export type CardNote = {
  icon: 'clock' | 'pin' | 'check' | 'info';
  text: string;
  /** Va en negrita después del texto ("20:45"). */
  strong?: string;
  /** Cuenta regresiva viva hasta este instante ("Lugar guardado 06:12"). */
  countdownTo?: string;
};

export type ReservationCardView = {
  bucket: ReservationBucket;
  phase: ReservationPhase;
  glyph: SlotGlyph;
  chips: CardChip[];
  note: CardNote | null;
  /** Botón "Pagar" / "Reintentar" en la tarjeta. */
  payAction: 'pay' | 'retry' | null;
  /**
   * "Cancelar reserva" sólo en Pendientes y Confirmadas: una que falta pagar
   * con la retención vencida sigue cancelable en el backend hasta que el
   * barrido la marca vencida, pero ya está en Canceladas como "Venció sin pago".
   */
  canCancel: boolean;
};

const TONE_TO_CHIP: Record<Tone, ChipTone> = {
  warn: 'refund',
  ok: 'green',
  err: 'rose',
  muted: 'slate',
  brand: 'blue',
};

const PAID = new Set(['approved', 'refunded', 'partially_refunded']);

function statusChip(booking: Booking, phase: ReservationPhase): CardChip {
  switch (phase) {
    case 'awaiting_payment':
      return { label: 'Falta pagar', tone: 'amber' };
    case 'payment_rejected':
      return { label: 'Pago rechazado', tone: 'rose' };
    case 'awaiting_approval':
      return { label: 'Esperando confirmación', tone: 'amber' };
    case 'confirmed':
      return { label: 'Confirmada', tone: 'blue' };
    case 'in_progress':
      return { label: 'En curso', tone: 'green', lead: 'live' };
    case 'completed':
      return { label: 'Completada', tone: 'slate' };
    case 'no_show':
      return { label: 'No te presentaste', tone: 'rose' };
    case 'cancelled':
      return booking.cancelledBy === 'driver'
        ? { label: 'Cancelada por vos', tone: 'slate' }
        : { label: 'Cancelada', tone: 'slate' };
    case 'cancelled_by_owner':
      return { label: 'Cancelada por el estacionamiento', tone: 'rose' };
    case 'rejected':
      return rejectionVariant(booking) === 'no_response'
        ? { label: 'Sin respuesta', tone: 'rose' }
        : { label: 'Rechazada', tone: 'rose' };
    case 'expired':
      return booking.paymentStatus !== null && PAID.has(booking.paymentStatus)
        ? { label: 'Venció', tone: 'slate' }
        : { label: 'Venció sin pago', tone: 'slate' };
  }
}

function glyphFor(bucket: ReservationBucket, booking: Booking): SlotGlyph {
  switch (bucket) {
    case 'pending':
      return 'wait';
    case 'confirmed':
      return 'in';
    case 'completed':
      // No se presentó: el lugar quedó vacío.
      return booking.lifecycle === 'no_show' ? 'empty' : 'done';
    case 'cancelled':
      return 'empty';
  }
}

function noteFor(booking: Booking, phase: ReservationPhase): CardNote | null {
  switch (phase) {
    case 'awaiting_payment':
    case 'payment_rejected':
      return booking.holdExpiresAt
        ? {
            icon: 'clock',
            text: 'Lugar guardado',
            countdownTo: booking.holdExpiresAt,
          }
        : null;
    case 'awaiting_approval':
      return booking.approvalDeadlineAt
        ? {
            icon: 'clock',
            text: 'Responde antes de las',
            strong: clockLabel(new Date(booking.approvalDeadlineAt)),
          }
        : null;
    case 'confirmed':
      return { icon: 'pin', text: booking.address };
    case 'in_progress':
      return {
        icon: 'pin',
        text: `${booking.address} · salís a las`,
        strong: booking.exit.timeLabel,
      };
    case 'rejected':
      if (rejectionVariant(booking) === 'no_response') {
        return { icon: 'info', text: 'No respondió a tiempo' };
      }
      return {
        icon: 'info',
        text: reasonText(booking) ?? 'La rechazó el estacionamiento',
      };
    case 'expired':
      return booking.paymentStatus !== null && PAID.has(booking.paymentStatus)
        ? null
        : { icon: 'info', text: 'No se te cobró nada' };
    case 'cancelled':
    case 'cancelled_by_owner': {
      const reason = reasonText(booking);
      return reason ? { icon: 'info', text: reason } : null;
    }
    default:
      return null;
  }
}

export function reservationCardView(
  booking: Booking,
  now: Date = new Date(),
): ReservationCardView {
  const bucket = reservationBucket(booking, now);
  const phase = reservationPhase(booking, now);
  const chips: CardChip[] = [statusChip(booking, phase)];
  const refund = refundChip(booking, phase);
  if (refund) {
    const tone = TONE_TO_CHIP[refund.tone];
    chips.push(
      tone === 'refund'
        ? { label: refund.label, tone, lead: 'refund' }
        : { label: refund.label, tone },
    );
  }
  return {
    bucket,
    phase,
    glyph: glyphFor(bucket, booking),
    chips,
    note: noteFor(booking, phase),
    payAction:
      bucket !== 'pending'
        ? null
        : phase === 'awaiting_payment'
          ? 'pay'
          : phase === 'payment_rejected'
            ? 'retry'
            : null,
    canCancel:
      booking.cancellable && (bucket === 'pending' || bucket === 'confirmed'),
  };
}

/** Texto para el lector de pantalla de toda la tarjeta. */
export function cardAccessibilityLabel(
  booking: Booking,
  view: ReservationCardView,
  when: string,
): string {
  const chips = view.chips.map((chip) => chip.label).join(', ');
  const note = view.note
    ? `. ${view.note.text}${view.note.strong ? ` ${view.note.strong}` : ''}`
    : '';
  return `${booking.parkingName}, ${when}, ${booking.priceLabel}. ${chips}${note}. Ver detalle`;
}
