import type { Booking } from './mock';

// Mapa de estado a pantalla. El backend define el estado (`lifecycle`, el pago
// y el reembolso); acá sólo se decide cómo se cuenta al conductor. Nunca se usa
// el `status` que trae el deep link de vuelta del checkout.

export type Tone = 'ok' | 'warn' | 'err' | 'muted' | 'brand';

export type ReservationPhase =
  | 'awaiting_payment'
  | 'payment_rejected'
  | 'awaiting_approval'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'cancelled_by_owner'
  | 'rejected'
  | 'expired'
  | 'no_show';

type PhaseInput = Pick<
  Booking,
  'lifecycle' | 'paymentStatus' | 'holdExpiresAt' | 'cancelledBy'
>;

export function reservationPhase(
  booking: PhaseInput,
  now: Date = new Date(),
): ReservationPhase {
  switch (booking.lifecycle) {
    case 'pending_payment':
      // El barrido del backend tarda unos segundos en pasarla a `expired`: si la
      // retención ya venció, no se ofrece pagar.
      if (holdExpired(booking.holdExpiresAt, now)) return 'expired';
      return booking.paymentStatus === 'rejected'
        ? 'payment_rejected'
        : 'awaiting_payment';
    case 'pending_approval':
      return 'awaiting_approval';
    case 'confirmed':
      return 'confirmed';
    case 'checked_in':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return booking.cancelledBy === 'owner'
        ? 'cancelled_by_owner'
        : 'cancelled';
    case 'rejected':
      return 'rejected';
    case 'expired':
      return 'expired';
    case 'no_show':
      return 'no_show';
  }
}

const BADGES: Record<ReservationPhase, { label: string; tone: Tone }> = {
  awaiting_payment: { label: 'Esperando pago', tone: 'warn' },
  payment_rejected: { label: 'Pago rechazado', tone: 'err' },
  awaiting_approval: { label: 'Por aceptar', tone: 'warn' },
  confirmed: { label: 'Confirmada', tone: 'ok' },
  in_progress: { label: 'En curso', tone: 'brand' },
  completed: { label: 'Completada', tone: 'muted' },
  cancelled: { label: 'Cancelada', tone: 'muted' },
  cancelled_by_owner: { label: 'Cancelada por el lugar', tone: 'err' },
  rejected: { label: 'Rechazada', tone: 'err' },
  expired: { label: 'Se liberó el lugar', tone: 'muted' },
  no_show: { label: 'No te presentaste', tone: 'muted' },
};

export function phaseBadge(phase: ReservationPhase): {
  label: string;
  tone: Tone;
} {
  return BADGES[phase];
}

/** Activa = todavía puede pasar algo (pagar, aceptar, llegar o estar adentro). */
const ACTIVE_PHASES: ReadonlySet<ReservationPhase> = new Set([
  'awaiting_payment',
  'payment_rejected',
  'awaiting_approval',
  'confirmed',
  'in_progress',
]);

export function isActivePhase(phase: ReservationPhase): boolean {
  return ACTIVE_PHASES.has(phase);
}

/**
 * Una confirmada cuyo egreso ya pasó deja de ser "activa" (el backend la
 * muestra `completed`, mientras la caja no la cierre).
 */
export function isActiveBooking(
  booking: PhaseInput & Pick<Booking, 'status'>,
  now: Date = new Date(),
): boolean {
  return (
    booking.status === 'active' && isActivePhase(reservationPhase(booking, now))
  );
}

// ─── Reembolso ──────────────────────────────────────────────────────────────

const PAID_PAYMENT = new Set(['approved', 'refunded', 'partially_refunded']);
const NO_REFUND_PHASES: ReadonlySet<ReservationPhase> = new Set([
  'cancelled',
  'no_show',
]);

export function formatArs(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`;
}

type RefundInput = Pick<
  Booking,
  'refundStatus' | 'refundedAmountArs' | 'totalArs' | 'paymentStatus'
>;

/**
 * Chip de reembolso de "Mis reservas". `null` cuando no hay nada que decir
 * (nunca se cobró, o la reserva sigue en pie).
 */
export function refundChip(
  booking: RefundInput,
  phase: ReservationPhase,
): { label: string; tone: Tone } | null {
  switch (booking.refundStatus) {
    case 'pending':
      return { label: 'Reembolso en curso', tone: 'warn' };
    case 'refunded':
    case 'partial':
      return {
        label: `Devuelto ${formatArs(booking.refundedAmountArs ?? booking.totalArs)}`,
        tone: 'ok',
      };
    case 'failed':
      return { label: 'Reembolso fallido', tone: 'err' };
    case 'none':
      return NO_REFUND_PHASES.has(phase) &&
        booking.paymentStatus !== null &&
        PAID_PAYMENT.has(booking.paymentStatus)
        ? { label: 'Sin reembolso', tone: 'muted' }
        : null;
  }
}

// ─── Motivo ─────────────────────────────────────────────────────────────────

const SYSTEM_REASONS: Record<string, string> = {
  approval_timeout: 'El estacionamiento no respondió a tiempo.',
  late_payment_no_capacity:
    'Se ocupó el último lugar mientras se acreditaba tu pago.',
  checkout_unavailable: 'No pudimos iniciar el pago con Mercado Pago.',
};

/**
 * Por qué cerró el estacionamiento (o el sistema) la reserva. Sólo para las
 * canceladas o rechazadas por otro: cuando cancela el conductor no hace falta.
 */
export function reasonText(
  booking: Pick<Booking, 'reason' | 'cancelledBy' | 'lifecycle'>,
): string | null {
  if (!booking.reason) return null;
  if (booking.cancelledBy === 'driver') return null;
  const system = SYSTEM_REASONS[booking.reason];
  if (system) return system;
  return booking.cancelledBy === 'owner' || booking.lifecycle === 'rejected'
    ? `Motivo: ${booking.reason}`
    : null;
}

// ─── Cuenta regresiva de la retención ───────────────────────────────────────

export function holdExpired(
  holdExpiresAt: string | null,
  now: Date = new Date(),
): boolean {
  return (
    holdExpiresAt !== null && new Date(holdExpiresAt).getTime() <= now.getTime()
  );
}

/** Segundos que quedan (0 si ya venció o si no hay retención). */
export function holdRemainingSeconds(
  holdExpiresAt: string | null,
  now: Date = new Date(),
): number {
  if (holdExpiresAt === null) return 0;
  const ms = new Date(holdExpiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 1000));
}

/** "09:58". */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ─── Política ───────────────────────────────────────────────────────────────

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** "17:00", hora argentina de un instante. */
export function clockLabel(instant: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

export type PolicyWindows = {
  /** Hasta cuándo se cancela gratis. */
  freeCancelUntil: Date;
  /** Desde cuándo se puede entrar. */
  enterFrom: Date;
  /** Hasta cuándo dura la tolerancia. */
  graceUntil: Date;
};

export function policyWindows(
  entryAt: string,
  policy: {
    freeCancelMinutes: number;
    earlyArrivalMinutes: number;
    graceMinutes: number;
  },
): PolicyWindows {
  const entry = new Date(entryAt).getTime();
  const minutes = (value: number) => value * 60_000;
  return {
    freeCancelUntil: new Date(entry - minutes(policy.freeCancelMinutes)),
    enterFrom: new Date(entry - minutes(policy.earlyArrivalMinutes)),
    graceUntil: new Date(entry + minutes(policy.graceMinutes)),
  };
}

/** "Cancelación gratis hasta las 17:00. Podés entrar desde las 17:45 y tenés tolerancia hasta las 18:30." */
export function policyText(
  entryAt: string,
  policy: {
    freeCancelMinutes: number;
    earlyArrivalMinutes: number;
    graceMinutes: number;
  },
): string {
  const windows = policyWindows(entryAt, policy);
  return (
    `Cancelación gratis hasta las ${clockLabel(windows.freeCancelUntil)}. ` +
    `Podés entrar desde las ${clockLabel(windows.enterFrom)} y tenés ` +
    `tolerancia hasta las ${clockLabel(windows.graceUntil)}.`
  );
}

// ─── Vista previa de la cancelación ─────────────────────────────────────────

type PreviewInput = {
  allowed: boolean;
  refundArs: number;
  kind: 'full' | 'partial' | 'none';
  reasonCode: string;
};

export type CancelPreviewCopy = {
  /** Frase corta de arriba ("Estás dentro de la cancelación gratis…"). */
  intro: string;
  /** "Te devolvemos $4.500" o "No corresponde reembolso". */
  refund: string;
  tone: Tone;
  /** `false`: no hay nada que confirmar, sólo se informa. */
  canConfirm: boolean;
};

export function cancelPreviewCopy(
  preview: PreviewInput,
  booking: Pick<Booking, 'entryAt' | 'policy'>,
): CancelPreviewCopy {
  const until = clockLabel(
    policyWindows(booking.entryAt, booking.policy).freeCancelUntil,
  );
  if (!preview.allowed) {
    return {
      intro:
        preview.reasonCode === 'already_started'
          ? 'La reserva ya empezó: no se puede cancelar.'
          : 'Esta reserva ya no se puede cancelar.',
      refund: 'No corresponde reembolso',
      tone: 'muted',
      canConfirm: false,
    };
  }
  const refund =
    preview.kind === 'none' || preview.refundArs <= 0
      ? 'No corresponde reembolso'
      : `Te devolvemos ${formatArs(preview.refundArs)}`;
  const tone: Tone = preview.kind === 'none' ? 'err' : 'ok';
  switch (preview.reasonCode) {
    case 'free_window':
      return {
        intro: `Estás dentro de la cancelación gratis (hasta las ${until}).`,
        refund,
        tone,
        canConfirm: true,
      };
    case 'late_window':
      return {
        intro:
          `Ya pasó la cancelación gratis (hasta las ${until}). Según la política ` +
          `del estacionamiento, ${
            preview.kind === 'none'
              ? 'no hay reembolso'
              : 'el reembolso es parcial'
          }.`,
        refund,
        tone,
        canConfirm: true,
      };
    case 'pending_approval':
      return {
        intro:
          'El estacionamiento todavía no aceptó tu reserva: te devolvemos todo.',
        refund,
        tone,
        canConfirm: true,
      };
    case 'not_paid':
      return {
        intro: 'Todavía no pagaste: no se te cobra nada.',
        refund: 'No se te cobra nada',
        tone: 'muted',
        canConfirm: true,
      };
    default:
      return { intro: '', refund, tone, canConfirm: true };
  }
}
