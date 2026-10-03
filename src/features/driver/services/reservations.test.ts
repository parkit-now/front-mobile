import { describe, expect, it, vi } from 'vitest';
import { newReservationId, toBooking } from './reservations';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

describe('reservas', () => {
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
    const booking = toBooking({
      id: 'r-1',
      code: 'R-C1BD05',
      state: 'active',
      cancellable: true,
      parkingId: 'p-1',
      parkingName: 'Estacionamiento Once',
      parkingAddress: 'BARTOLOME MITRE 2500, Comuna 3, CABA',
      latitude: -34.6086,
      longitude: -58.4019,
      vehiclePlate: 'AB123CD',
      entryAt: '2026-09-28T13:00:00.000Z',
      exitAt: '2026-09-28T15:00:00.000Z',
      totalArs: 9000,
      rateName: 'RESERVAS',
      createdAt: '2026-09-27T22:00:00.000Z',
    });
    expect(booking).toMatchObject({
      address: 'Bartolome Mitre 2500',
      entry: { timeLabel: '10:00' },
      exit: { timeLabel: '12:00' },
      priceLabel: '$9.000',
      status: 'active',
      ticketCode: 'R-C1BD05',
    });
  });

  it('separa ingreso y egreso aunque la estadía termine otro día', () => {
    const booking = toBooking({
      id: 'r-2',
      code: 'R-000002',
      state: 'active',
      cancellable: true,
      parkingId: 'p-1',
      parkingName: 'Estacionamiento Once',
      parkingAddress: null,
      latitude: null,
      longitude: null,
      vehiclePlate: 'AB123CD',
      // 22:00 del 28 a 01:00 del 29, hora argentina.
      entryAt: '2026-09-29T01:00:00.000Z',
      exitAt: '2026-09-29T04:00:00.000Z',
      totalArs: 13500,
      rateName: 'RESERVAS',
      createdAt: '2026-09-27T22:00:00.000Z',
    });
    expect(booking.entry.timeLabel).toBe('22:00');
    expect(booking.exit.timeLabel).toBe('01:00');
    expect(booking.entry.dateLabel).toMatch(/28/);
    expect(booking.exit.dateLabel).toMatch(/29/);
  });
});
