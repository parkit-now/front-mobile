import type { Booking, ParkingLot } from './mock';

const MOCK_STAY_HOURS = 2;

export function createMockReservation(
  parking: ParkingLot,
  timestamp = Date.now(),
): Booking {
  return {
    id: `booking-${timestamp}`,
    parkingName: parking.name,
    address: parking.address,
    dateLabel: 'Hoy',
    timeLabel: '18:30 - 20:30',
    status: 'active',
    ticketCode: `PKT-${String(timestamp).slice(-4)}`,
    priceLabel: `$${(parking.hourlyPriceArs * MOCK_STAY_HOURS).toLocaleString('es-AR')}`,
  };
}
