import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/client';
import {
  cancelReservation,
  createReservation,
  newReservationId,
  previewCancel,
  retryReservationPayment,
  toBooking,
} from './reservations';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

const row = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'r-1',
    code: 'R-C1BD05',
    state: 'active',
    cancellable: true,
    parkingName: 'Estacionamiento Once',
    parkingAddress: 'BARTOLOME MITRE 2500, Comuna 3, CABA',
    latitude: -34.6086,
    longitude: -58.4019,
    vehiclePlate: 'AB123CD',
    entryAt: '2026-09-28T13:00:00.000Z',
    exitAt: '2026-09-28T15:00:00.000Z',
    totalArs: 9000,
    status: 'pending_payment',
    refundStatus: 'none',
    refundedAmountArs: null,
    policy: {
      freeCancelMinutes: 60,
      lateCancelRefundPct: 0,
      earlyArrivalMinutes: 15,
      graceMinutes: 30,
      acceptanceMode: 'auto',
      approvalWindowMinutes: 15,
    },
    holdExpiresAt: '2026-09-27T12:10:00.000Z',
    approvalDeadlineAt: null,
    payment: {
      status: 'created',
      checkoutUrl: 'http://localhost:3000/dev/checkout/r-1',
    },
    cancelledBy: null,
    reason: null,
    ...overrides,
  }) as Parameters<typeof toBooking>[0];

describe('reservas', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it('genera UUID v4 válidos y distintos', () => {
    const ids = new Set(Array.from({ length: 50 }, newReservationId));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it('muestra la reserva en hora argentina', () => {
    expect(toBooking(row())).toMatchObject({
      address: 'Bartolome Mitre 2500',
      entry: { timeLabel: '10:00' },
      exit: { timeLabel: '12:00' },
      priceLabel: '$9.000',
      status: 'active',
      lifecycle: 'pending_payment',
      ticketCode: 'R-C1BD05',
    });
  });

  it('separa ingreso y egreso aunque la estadía termine otro día', () => {
    const booking = toBooking(
      row({
        parkingAddress: null,
        latitude: null,
        longitude: null,
        // 22:00 del 28 a 01:00 del 29, hora argentina.
        entryAt: '2026-09-29T01:00:00.000Z',
        exitAt: '2026-09-29T04:00:00.000Z',
      }),
    );
    expect(booking.entry.timeLabel).toBe('22:00');
    expect(booking.exit.timeLabel).toBe('01:00');
    expect(booking.entry.dateLabel).toMatch(/28/);
    expect(booking.exit.dateLabel).toMatch(/29/);
  });

  it('trae el pago, el reembolso y quién canceló', () => {
    const booking = toBooking(
      row({
        status: 'cancelled',
        state: 'cancelled',
        cancelledBy: 'owner',
        reason: 'Corte de luz',
        refundStatus: 'refunded',
        refundedAmountArs: 9000,
        payment: { status: 'refunded', checkoutUrl: null },
      }),
    );
    expect(booking).toMatchObject({
      lifecycle: 'cancelled',
      cancelledBy: 'owner',
      reason: 'Corte de luz',
      refundStatus: 'refunded',
      refundedAmountArs: 9000,
      paymentStatus: 'refunded',
      checkoutUrl: null,
    });
  });

  it('crea la reserva con el returnUrl y devuelve el checkout', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      reservation: row(),
      payment: {
        checkoutUrl: 'http://localhost:3000/dev/checkout/r-1',
        holdExpiresAt: '2026-09-27T12:10:00.000Z',
      },
    });
    const created = await createReservation(
      {
        id: 'r-1',
        parkingId: 'p-1',
        vehiclePlate: 'AB123CD',
        entryAt: '2026-09-28T10:00:00-03:00',
        exitAt: '2026-09-28T12:00:00-03:00',
        returnUrl: 'exp://localhost:8081/--/reservas/r-1',
      },
      'token',
    );
    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/driver/reservations',
        body: expect.objectContaining({
          returnUrl: 'exp://localhost:8081/--/reservas/r-1',
        }) as unknown,
      }),
    );
    expect(created.checkoutUrl).toBe('http://localhost:3000/dev/checkout/r-1');
    expect(created.booking.id).toBe('r-1');
  });

  it('reintenta el pago, vista previa y cancelación pegan a su endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      reservation: row(),
      payment: { checkoutUrl: null, holdExpiresAt: null },
    });
    await retryReservationPayment('r-1', 't');
    expect(apiRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/driver/reservations/r-1/payment',
      }),
    );
    vi.mocked(apiRequest).mockResolvedValue({ allowed: true });
    await previewCancel('r-1', 't');
    expect(apiRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/driver/reservations/r-1/cancel-preview',
      }),
    );
    vi.mocked(apiRequest).mockResolvedValue(row());
    await cancelReservation('r-1', 't');
    expect(apiRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/driver/reservations/r-1/cancel',
      }),
    );
  });
});
