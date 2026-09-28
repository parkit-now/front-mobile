import { describe, expect, it } from 'vitest';
import { createMockReservation } from './createReservation';
import { PARKING_LOTS } from './mock';

describe('createMockReservation', () => {
  it('crea una reserva activa de dos horas con identificadores estables', () => {
    const booking = createMockReservation(PARKING_LOTS[0], 1_725_000_004_821);

    expect(booking).toMatchObject({
      id: 'booking-1725000004821',
      parkingName: 'Estacionamiento Once',
      status: 'active',
      ticketCode: 'PKT-4821',
      priceLabel: '$3.600',
    });
  });
});
