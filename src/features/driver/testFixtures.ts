import type { Booking, ParkingLot } from './mock';

// Fixtures de los tests: una reserva y una playa de ejemplo, con lo justo
// sobreescrito en cada caso.

export function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'b-1',
    parkingName: 'Estacionamiento Once',
    address: 'Bartolome Mitre 2500',
    entryAt: '2026-09-28T21:00:00.000Z',
    exitAt: '2026-09-29T00:00:00.000Z',
    entry: { dateLabel: 'lun, 28 sept', timeLabel: '18:00' },
    exit: { dateLabel: 'lun, 28 sept', timeLabel: '21:00' },
    status: 'active',
    lifecycle: 'confirmed',
    ticketCode: 'R-4F2K9A',
    priceLabel: '$4.500',
    totalArs: 4500,
    vehiclePlate: 'AB123CD',
    cancellable: true,
    refundStatus: 'none',
    refundedAmountArs: null,
    cancelledBy: null,
    reason: null,
    holdExpiresAt: null,
    approvalDeadlineAt: null,
    paymentStatus: 'approved',
    checkoutUrl: null,
    policy: {
      freeCancelMinutes: 60,
      lateCancelRefundPct: 0,
      earlyArrivalMinutes: 15,
      graceMinutes: 30,
      acceptanceMode: 'auto',
      approvalWindowMinutes: 15,
    },
    coordinate: { latitude: -34.6086, longitude: -58.4019 },
    ...overrides,
  };
}

export function makeParking(overrides: Partial<ParkingLot> = {}): ParkingLot {
  return {
    id: 'p-1',
    name: 'Estacionamiento Once',
    address: 'Bartolome Mitre 2500',
    distance: '300 m',
    eta: '4 min',
    priceLabel: '$1.500/h',
    hourlyPriceArs: 1500,
    rating: '—',
    availableSpots: 12,
    totalSpots: 40,
    services: ['Reserva anticipada'],
    openUntil: 'Abierto ahora',
    acceptsReservations: true,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: ['car', 'suv'],
    reservationRules: {
      acceptanceMode: 'auto',
      freeCancelMinutes: 60,
      lateCancelRefundPct: 0,
      earlyArrivalMinutes: 15,
      graceMinutes: 30,
    },
    coordinate: { latitude: -34.6086, longitude: -58.4019 },
    ...overrides,
  };
}
