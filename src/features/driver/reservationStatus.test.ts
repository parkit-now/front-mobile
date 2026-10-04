import { describe, expect, it } from 'vitest';
import {
  cancelPreviewCopy,
  formatCountdown,
  holdExpired,
  holdRemainingSeconds,
  isActiveBooking,
  phaseBadge,
  policyText,
  reasonText,
  refundChip,
  reservationPhase,
} from './reservationStatus';
import { makeBooking } from './testFixtures';

const NOW = new Date('2026-09-28T20:00:00.000Z');

describe('reservationPhase: estado del backend a pantalla', () => {
  it.each([
    [{ lifecycle: 'pending_approval' }, 'awaiting_approval'],
    [{ lifecycle: 'confirmed' }, 'confirmed'],
    [{ lifecycle: 'checked_in' }, 'in_progress'],
    [{ lifecycle: 'completed' }, 'completed'],
    [{ lifecycle: 'rejected' }, 'rejected'],
    [{ lifecycle: 'expired' }, 'expired'],
    [{ lifecycle: 'no_show' }, 'no_show'],
    [{ lifecycle: 'cancelled', cancelledBy: 'driver' }, 'cancelled'],
    [{ lifecycle: 'cancelled', cancelledBy: 'system' }, 'cancelled'],
    [{ lifecycle: 'cancelled', cancelledBy: 'owner' }, 'cancelled_by_owner'],
  ] as const)('%j es %s', (overrides, expected) => {
    expect(reservationPhase(makeBooking(overrides), NOW)).toBe(expected);
  });

  it('pending_payment: esperando pago, con pago rechazado o vencida', () => {
    const hold = '2026-09-28T20:10:00.000Z';
    const pending = makeBooking({
      lifecycle: 'pending_payment',
      holdExpiresAt: hold,
      paymentStatus: 'created',
    });
    expect(reservationPhase(pending, NOW)).toBe('awaiting_payment');
    expect(
      reservationPhase({ ...pending, paymentStatus: 'rejected' }, NOW),
    ).toBe('payment_rejected');
    // La retención venció pero el barrido del backend todavía no la marcó.
    expect(
      reservationPhase(
        { ...pending, holdExpiresAt: '2026-09-28T19:59:59.000Z' },
        NOW,
      ),
    ).toBe('expired');
  });

  it('los chips tienen texto y tono por estado', () => {
    expect(phaseBadge('confirmed')).toEqual({
      label: 'Confirmada',
      tone: 'ok',
    });
    expect(phaseBadge('awaiting_approval').label).toBe('Por aceptar');
    expect(phaseBadge('cancelled_by_owner').label).toBe(
      'Cancelada por el lugar',
    );
    expect(phaseBadge('payment_rejected').tone).toBe('err');
  });

  it('una reserva es activa mientras puede pasar algo', () => {
    expect(isActiveBooking(makeBooking(), NOW)).toBe(true);
    expect(
      isActiveBooking(makeBooking({ lifecycle: 'pending_approval' }), NOW),
    ).toBe(true);
    expect(
      isActiveBooking(
        makeBooking({ lifecycle: 'expired', status: 'cancelled' }),
        NOW,
      ),
    ).toBe(false);
    expect(
      isActiveBooking(
        makeBooking({ lifecycle: 'no_show', status: 'completed' }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe('refundChip', () => {
  const base = makeBooking({ lifecycle: 'cancelled' });
  it('reembolso en curso, devuelto y fallido', () => {
    expect(
      refundChip({ ...base, refundStatus: 'pending' }, 'cancelled'),
    ).toEqual({ label: 'Reembolso en curso', tone: 'warn' });
    expect(
      refundChip(
        { ...base, refundStatus: 'refunded', refundedAmountArs: 4500 },
        'cancelled',
      ),
    ).toEqual({ label: 'Devuelto $4.500', tone: 'ok' });
    expect(
      refundChip(
        { ...base, refundStatus: 'partial', refundedAmountArs: 2250 },
        'cancelled',
      )?.label,
    ).toBe('Devuelto $2.250');
    expect(
      refundChip({ ...base, refundStatus: 'failed' }, 'rejected')?.tone,
    ).toBe('err');
  });

  it('"Sin reembolso" sólo si se cobró y se cerró sin devolver', () => {
    expect(refundChip(base, 'cancelled')).toEqual({
      label: 'Sin reembolso',
      tone: 'muted',
    });
    expect(refundChip(base, 'no_show')?.label).toBe('Sin reembolso');
    // Nunca se cobró: no hay nada que decir.
    expect(
      refundChip({ ...base, paymentStatus: 'created' }, 'cancelled'),
    ).toBeNull();
    expect(refundChip({ ...base, paymentStatus: null }, 'expired')).toBeNull();
    // Reserva en pie: tampoco.
    expect(refundChip(makeBooking(), 'confirmed')).toBeNull();
  });
});

describe('reasonText', () => {
  it('traduce los códigos del sistema y muestra el motivo del dueño', () => {
    expect(
      reasonText(
        makeBooking({
          lifecycle: 'rejected',
          cancelledBy: 'system',
          reason: 'approval_timeout',
        }),
      ),
    ).toBe('El estacionamiento no respondió a tiempo.');
    expect(
      reasonText(
        makeBooking({
          lifecycle: 'cancelled',
          cancelledBy: 'owner',
          reason: 'Corte de luz',
        }),
      ),
    ).toBe('Motivo: Corte de luz');
  });

  it('no repite el motivo cuando canceló el conductor', () => {
    expect(
      reasonText(
        makeBooking({
          lifecycle: 'cancelled',
          cancelledBy: 'driver',
          reason: 'lo que sea',
        }),
      ),
    ).toBeNull();
    expect(reasonText(makeBooking())).toBeNull();
  });
});

describe('cuenta regresiva de la retención', () => {
  it('cuenta segundos y no baja de cero', () => {
    const hold = '2026-09-28T20:09:58.000Z';
    expect(holdRemainingSeconds(hold, NOW)).toBe(598);
    expect(formatCountdown(598)).toBe('09:58');
    expect(formatCountdown(5)).toBe('00:05');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-3)).toBe('00:00');
    expect(holdRemainingSeconds('2026-09-28T19:00:00.000Z', NOW)).toBe(0);
    expect(holdRemainingSeconds(null, NOW)).toBe(0);
  });

  it('redondea hacia arriba: 0,4 s todavía cuenta', () => {
    expect(holdRemainingSeconds('2026-09-28T20:00:00.400Z', NOW)).toBe(1);
  });

  it('holdExpired: en el instante exacto ya venció', () => {
    expect(holdExpired('2026-09-28T20:00:00.000Z', NOW)).toBe(true);
    expect(holdExpired('2026-09-28T20:00:01.000Z', NOW)).toBe(false);
    expect(holdExpired(null, NOW)).toBe(false);
  });
});

describe('policyText', () => {
  it('arma los plazos en hora argentina', () => {
    // Ingreso 18:00 (21:00Z): gratis hasta 17:00, entra desde 17:45, tolerancia hasta 18:30.
    expect(
      policyText('2026-09-28T21:00:00.000Z', {
        freeCancelMinutes: 60,
        earlyArrivalMinutes: 15,
        graceMinutes: 30,
      }),
    ).toBe(
      'Cancelación gratis hasta las 17:00. Podés entrar desde las 17:45 y tenés tolerancia hasta las 18:30.',
    );
  });
});

describe('cancelPreviewCopy', () => {
  const booking = makeBooking();
  it('gratis: "Te devolvemos $X"', () => {
    const copy = cancelPreviewCopy(
      {
        allowed: true,
        refundArs: 4500,
        kind: 'full',
        reasonCode: 'free_window',
      },
      booking,
    );
    expect(copy.refund).toBe('Te devolvemos $4.500');
    expect(copy.intro).toContain('hasta las 17:00');
    expect(copy.canConfirm).toBe(true);
    expect(copy.tone).toBe('ok');
  });

  it('tardía sin reembolso: "No corresponde reembolso"', () => {
    const copy = cancelPreviewCopy(
      { allowed: true, refundArs: 0, kind: 'none', reasonCode: 'late_window' },
      booking,
    );
    expect(copy.refund).toBe('No corresponde reembolso');
    expect(copy.intro).toContain('no hay reembolso');
    expect(copy.tone).toBe('err');
  });

  it('parcial', () => {
    const copy = cancelPreviewCopy(
      {
        allowed: true,
        refundArs: 2250,
        kind: 'partial',
        reasonCode: 'late_window',
      },
      booking,
    );
    expect(copy.refund).toBe('Te devolvemos $2.250');
    expect(copy.intro).toContain('parcial');
  });

  it('sin pagar: no se cobra nada; ya empezada: no se puede cancelar', () => {
    expect(
      cancelPreviewCopy(
        { allowed: true, refundArs: 0, kind: 'none', reasonCode: 'not_paid' },
        booking,
      ).refund,
    ).toBe('No se te cobra nada');
    const started = cancelPreviewCopy(
      {
        allowed: false,
        refundArs: 0,
        kind: 'none',
        reasonCode: 'already_started',
      },
      booking,
    );
    expect(started.canConfirm).toBe(false);
    expect(started.intro).toContain('ya empezó');
  });
});
