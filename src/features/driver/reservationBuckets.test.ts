import { describe, expect, it } from 'vitest';
import type { Booking } from './mock';
import {
  bucketCounts,
  bucketReservations,
  defaultBucket,
  reservationBucket,
  reservationCardView,
  tabDirection,
} from './reservationBuckets';
import { makeBooking } from './testFixtures';

const NOW = new Date('2026-10-03T23:30:00.000Z');
const LATER = '2026-10-03T23:40:00.000Z';
const EARLIER = '2026-10-03T23:20:00.000Z';

const pendingPaymentAlive = makeBooking({
  id: 'pay-alive',
  lifecycle: 'pending_payment',
  paymentStatus: 'created',
  holdExpiresAt: LATER,
});
const pendingPaymentDead = makeBooking({
  id: 'pay-dead',
  lifecycle: 'pending_payment',
  paymentStatus: 'created',
  holdExpiresAt: EARLIER,
});

describe('reservationBucket', () => {
  const cases: Array<[string, Partial<Booking>, string]> = [
    ['por aceptar', { lifecycle: 'pending_approval' }, 'pending'],
    ['confirmada', { lifecycle: 'confirmed' }, 'confirmed'],
    ['en curso', { lifecycle: 'checked_in' }, 'confirmed'],
    [
      'confirmada con el egreso vencido',
      { lifecycle: 'confirmed', status: 'completed' },
      'completed',
    ],
    [
      'completada',
      { lifecycle: 'completed', status: 'completed' },
      'completed',
    ],
    [
      'no se presentó',
      { lifecycle: 'no_show', status: 'completed' },
      'completed',
    ],
    [
      'cancelada por el conductor',
      { lifecycle: 'cancelled', status: 'cancelled', cancelledBy: 'driver' },
      'cancelled',
    ],
    [
      'cancelada por el estacionamiento',
      { lifecycle: 'cancelled', status: 'cancelled', cancelledBy: 'owner' },
      'cancelled',
    ],
    ['rechazada', { lifecycle: 'rejected', status: 'cancelled' }, 'cancelled'],
    [
      'sin respuesta',
      {
        lifecycle: 'rejected',
        status: 'cancelled',
        cancelledBy: 'system',
        reason: 'approval_timeout',
      },
      'cancelled',
    ],
    ['vencida', { lifecycle: 'expired', status: 'cancelled' }, 'cancelled'],
  ];
  it.each(cases)('%s', (_name, overrides, expected) => {
    expect(reservationBucket(makeBooking(overrides), NOW)).toBe(expected);
  });

  it('falta pagar: pendiente mientras el lugar sigue guardado', () => {
    expect(reservationBucket(pendingPaymentAlive, NOW)).toBe('pending');
  });

  it('falta pagar con la retención vencida: cancelada aunque el backend no la marcó', () => {
    expect(reservationBucket(pendingPaymentDead, NOW)).toBe('cancelled');
  });
});

describe('bucketReservations', () => {
  const list = [
    makeBooking({
      id: 'c-late',
      lifecycle: 'confirmed',
      entryAt: '2026-10-08T12:00:00Z',
    }),
    makeBooking({
      id: 'c-soon',
      lifecycle: 'confirmed',
      entryAt: '2026-10-04T12:00:00Z',
    }),
    makeBooking({
      id: 'live',
      lifecycle: 'checked_in',
      entryAt: '2026-10-03T22:00:00Z',
    }),
    makeBooking({
      id: 'done-old',
      lifecycle: 'completed',
      status: 'completed',
      entryAt: '2026-09-28T12:00:00Z',
    }),
    makeBooking({
      id: 'done-new',
      lifecycle: 'no_show',
      status: 'completed',
      entryAt: '2026-09-30T12:00:00Z',
    }),
    makeBooking({
      id: 'p2',
      lifecycle: 'pending_approval',
      entryAt: '2026-10-05T12:00:00Z',
    }),
    { ...pendingPaymentAlive, entryAt: '2026-10-04T12:00:00Z' },
    { ...pendingPaymentDead, entryAt: '2026-09-29T12:00:00Z' },
    makeBooking({
      id: 'rej',
      lifecycle: 'rejected',
      status: 'cancelled',
      entryAt: '2026-10-01T12:00:00Z',
    }),
  ];
  const buckets = bucketReservations(list, NOW);

  it('pendientes: la próxima primero', () => {
    expect(buckets.pending.map((b) => b.id)).toEqual(['pay-alive', 'p2']);
  });

  it('confirmadas: la que está en curso primero, después por fecha', () => {
    expect(buckets.confirmed.map((b) => b.id)).toEqual([
      'live',
      'c-soon',
      'c-late',
    ]);
  });

  it('historial: la más reciente primero', () => {
    expect(buckets.completed.map((b) => b.id)).toEqual([
      'done-new',
      'done-old',
    ]);
    expect(buckets.cancelled.map((b) => b.id)).toEqual(['rej', 'pay-dead']);
  });

  it('cuenta cada pestaña', () => {
    expect(bucketCounts(buckets)).toEqual({
      pending: 2,
      confirmed: 3,
      completed: 2,
      cancelled: 2,
    });
  });
});

describe('defaultBucket', () => {
  it('Pendientes si hay algo esperando, si no Confirmadas', () => {
    expect(
      defaultBucket({ pending: 1, confirmed: 3, completed: 0, cancelled: 0 }),
    ).toBe('pending');
    expect(
      defaultBucket({ pending: 0, confirmed: 0, completed: 4, cancelled: 2 }),
    ).toBe('confirmed');
  });
});

describe('tabDirection', () => {
  it('las tarjetas entran desde el lado de la pestaña tocada', () => {
    expect(tabDirection('pending', 'completed')).toBe(1);
    expect(tabDirection('cancelled', 'confirmed')).toBe(-1);
    expect(tabDirection('confirmed', 'confirmed')).toBe(1);
  });
});

describe('reservationCardView', () => {
  const labels = (booking: Booking) =>
    reservationCardView(booking, NOW).chips.map((chip) => chip.label);

  it('por aceptar: ámbar, autito afuera y hora límite', () => {
    const view = reservationCardView(
      makeBooking({
        lifecycle: 'pending_approval',
        approvalDeadlineAt: '2026-10-03T23:45:00.000Z',
      }),
      NOW,
    );
    expect(view.glyph).toBe('wait');
    expect(view.chips).toEqual([
      { label: 'Esperando confirmación', tone: 'amber' },
    ]);
    expect(view.note).toEqual({
      icon: 'clock',
      text: 'Responde antes de las',
      strong: '20:45',
    });
    expect(view.payAction).toBeNull();
  });

  it('falta pagar: cuenta regresiva de la retención y botón Pagar', () => {
    const view = reservationCardView(pendingPaymentAlive, NOW);
    expect(view.chips[0]).toEqual({ label: 'Falta pagar', tone: 'amber' });
    expect(view.note).toEqual({
      icon: 'clock',
      text: 'Lugar guardado',
      countdownTo: LATER,
    });
    expect(view.payAction).toBe('pay');
  });

  it('pago rechazado con el lugar guardado: reintentar', () => {
    const view = reservationCardView(
      { ...pendingPaymentAlive, paymentStatus: 'rejected' },
      NOW,
    );
    expect(view.chips[0]).toEqual({ label: 'Pago rechazado', tone: 'rose' });
    expect(view.payAction).toBe('retry');
  });

  it('venció sin pago: nada que cobrar ni pagar', () => {
    const view = reservationCardView(pendingPaymentDead, NOW);
    expect(view.bucket).toBe('cancelled');
    expect(view.glyph).toBe('empty');
    expect(labels(pendingPaymentDead)).toEqual(['Venció sin pago']);
    expect(view.note).toEqual({ icon: 'info', text: 'No se te cobró nada' });
    expect(view.payAction).toBeNull();
  });

  it('expirada por el backend: igual que la que venció sin pago', () => {
    const expired = makeBooking({
      lifecycle: 'expired',
      status: 'cancelled',
      paymentStatus: 'created',
    });
    expect(labels(expired)).toEqual(['Venció sin pago']);
  });

  it('confirmada: azul, autito adentro y dirección', () => {
    const view = reservationCardView(
      makeBooking({ lifecycle: 'confirmed' }),
      NOW,
    );
    expect(view.glyph).toBe('in');
    expect(view.chips).toEqual([{ label: 'Confirmada', tone: 'blue' }]);
    expect(view.note).toEqual({ icon: 'pin', text: 'Bartolome Mitre 2500' });
  });

  it('en curso: punto vivo y hora de salida', () => {
    const view = reservationCardView(
      makeBooking({ lifecycle: 'checked_in' }),
      NOW,
    );
    expect(view.chips).toEqual([
      { label: 'En curso', tone: 'green', lead: 'live' },
    ]);
    expect(view.note?.strong).toBe('21:00');
  });

  it('completada: gris', () => {
    const view = reservationCardView(
      makeBooking({ lifecycle: 'completed', status: 'completed' }),
      NOW,
    );
    expect(view.glyph).toBe('done');
    expect(view.chips).toEqual([{ label: 'Completada', tone: 'slate' }]);
  });

  it('no se presentó: sin reembolso y lugar vacío', () => {
    const booking = makeBooking({ lifecycle: 'no_show', status: 'completed' });
    expect(labels(booking)).toEqual(['No te presentaste', 'Sin reembolso']);
    expect(reservationCardView(booking, NOW).glyph).toBe('empty');
  });

  it('cancelada por vos con devolución', () => {
    const booking = makeBooking({
      lifecycle: 'cancelled',
      status: 'cancelled',
      cancelledBy: 'driver',
      refundStatus: 'refunded',
      refundedAmountArs: 4500,
    });
    expect(reservationCardView(booking, NOW).chips).toEqual([
      { label: 'Cancelada por vos', tone: 'slate' },
      { label: 'Devuelto $4.500', tone: 'green' },
    ]);
  });

  it('cancelada por el estacionamiento: con el motivo', () => {
    const view = reservationCardView(
      makeBooking({
        lifecycle: 'cancelled',
        status: 'cancelled',
        cancelledBy: 'owner',
        reason: 'Inundación',
        refundStatus: 'pending',
      }),
      NOW,
    );
    expect(view.chips).toEqual([
      { label: 'Cancelada por el estacionamiento', tone: 'rose' },
      { label: 'Reembolso en curso', tone: 'refund', lead: 'refund' },
    ]);
    expect(view.note).toEqual({ icon: 'info', text: 'Motivo: Inundación' });
  });

  it('rechazada: reembolso en curso y motivo', () => {
    const view = reservationCardView(
      makeBooking({
        lifecycle: 'rejected',
        status: 'cancelled',
        cancelledBy: 'owner',
        reason: 'Corte de luz',
        refundStatus: 'pending',
      }),
      NOW,
    );
    expect(view.chips.map((chip) => chip.label)).toEqual([
      'Rechazada',
      'Reembolso en curso',
    ]);
    expect(view.note).toEqual({ icon: 'info', text: 'Motivo: Corte de luz' });
  });

  it('rechazada sin motivo', () => {
    const view = reservationCardView(
      makeBooking({
        lifecycle: 'rejected',
        status: 'cancelled',
        cancelledBy: 'owner',
      }),
      NOW,
    );
    expect(view.note).toEqual({
      icon: 'info',
      text: 'La rechazó el estacionamiento',
    });
  });

  it('sin respuesta: venció el plazo de aprobación', () => {
    const view = reservationCardView(
      makeBooking({
        lifecycle: 'rejected',
        status: 'cancelled',
        cancelledBy: 'system',
        reason: 'approval_timeout',
        refundStatus: 'refunded',
        refundedAmountArs: 4500,
      }),
      NOW,
    );
    expect(view.chips.map((chip) => chip.label)).toEqual([
      'Sin respuesta',
      'Devuelto $4.500',
    ]);
    expect(view.note).toEqual({ icon: 'info', text: 'No respondió a tiempo' });
  });
});
