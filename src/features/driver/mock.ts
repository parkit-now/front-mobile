import type { components } from '../../generated/api-types';

type ReservableCategory = components['schemas']['ReservableVehicleCategory'];

export type ParkingSchedule = {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  openMinute: number;
  closeMinute: number;
};

/** Reglas de la reserva que muestra el detalle (GET /driver/parkings/:id). */
export type ReservationRules = {
  acceptanceMode: 'auto' | 'manual';
  /** Cancelación gratis hasta estos minutos antes del ingreso. */
  freeCancelMinutes: number;
  /** % que se devuelve si se cancela pasado el corte gratis. */
  lateCancelRefundPct: number;
  /** Minutos antes del ingreso desde los que se puede llegar. */
  earlyArrivalMinutes: number;
  /** Tolerancia tras la hora de ingreso. */
  graceMinutes: number;
};

export type ParkingLot = {
  id: string;
  name: string;
  address: string;
  distance: string;
  eta: string;
  priceLabel: string;
  // Hora de la tarifa de reservas de la playa, igual para cualquier vehículo.
  // 0 si la playa no toma reservas.
  hourlyPriceArs: number;
  rating: string;
  availableSpots: number | null;
  // Capacidad total del estacionamiento (settings.capacity.total).
  totalSpots: number | null;
  services: string[];
  openUntil: string;
  acceptsReservations: boolean;
  openNow: boolean | null;
  schedules: ParkingSchedule[];
  reservationMaxDaysAhead: number;
  /** Horario efectivo de reservas (el de apertura si el dueño no cargó uno). */
  reservationHours: ParkingSchedule[];
  /** Categorías de vehículo que pueden reservar; vacío si no toma reservas. */
  reservationVehicleCategories: ReservableCategory[];
  reservationRules: ReservationRules | null;
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

/** Estado "grueso" del backend: activa, completada o cancelada. */
export type BookingStatus = 'active' | 'completed' | 'cancelled';

/** Ciclo de vida completo de la reserva (ReservationStatus del backend). */
export type ReservationLifecycle = components['schemas']['ReservationStatus'];

export type RefundStatus =
  | 'none'
  | 'pending'
  | 'refunded'
  | 'partial'
  | 'failed';

/** Fecha y hora de un extremo de la reserva, ya formateadas en hora argentina. */
export type BookingMoment = { dateLabel: string; timeLabel: string };

export type Booking = {
  id: string;
  parkingName: string;
  address: string;
  /** ISO del ingreso, para ordenar y para calcular los plazos de la política. */
  entryAt: string;
  /** ISO del egreso. */
  exitAt: string;
  /** Ingreso y egreso por separado: la estadía puede terminar otro día. */
  entry: BookingMoment;
  exit: BookingMoment;
  status: BookingStatus;
  /** Ciclo de vida completo: lo que define qué se muestra. */
  lifecycle: ReservationLifecycle;
  ticketCode: string;
  priceLabel: string;
  totalArs: number;
  vehiclePlate: string;
  /** Activa y sin empezar: se puede cancelar. */
  cancellable: boolean;
  refundStatus: RefundStatus;
  refundedAmountArs: number | null;
  /** Quién canceló o rechazó, y por qué (texto del dueño o código del sistema). */
  cancelledBy: 'driver' | 'owner' | 'system' | null;
  reason: string | null;
  /** Hasta cuándo se puede pagar (pending_payment). */
  holdExpiresAt: string | null;
  /** Hasta cuándo puede responder el dueño (pending_approval). */
  approvalDeadlineAt: string | null;
  /** Estado del último intento de pago (created, approved, rejected, …). */
  paymentStatus: string | null;
  /** Donde se paga; sólo mientras el pago está pendiente. */
  checkoutUrl: string | null;
  policy: ReservationPolicy;
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export type ReservationPolicy = {
  freeCancelMinutes: number;
  lateCancelRefundPct: number;
  earlyArrivalMinutes: number;
  graceMinutes: number;
  acceptanceMode: 'auto' | 'manual';
  approvalWindowMinutes: number;
};

export const PARKING_LOTS: ParkingLot[] = [
  {
    id: 'once-central',
    name: 'Estacionamiento Once',
    address: 'Av. Rivadavia 2850',
    distance: '650 m',
    eta: '4 min',
    priceLabel: '$1.800/h',
    hourlyPriceArs: 1800,
    rating: '4.8',
    availableSpots: 12,
    totalSpots: 20,
    services: ['Reserva anticipada', 'Techado', '24 h'],
    openUntil: 'Abierto hasta 23:30',
    acceptsReservations: true,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: [],
    reservationRules: null,
    coordinate: { latitude: -34.6098, longitude: -58.4079 },
  },
  {
    id: 'belgrano-norte',
    name: 'Belgrano Norte Parking',
    address: 'Mendoza 1712',
    distance: '1,4 km',
    eta: '8 min',
    priceLabel: '$2.100/h',
    hourlyPriceArs: 2100,
    rating: '4.7',
    availableSpots: 7,
    totalSpots: 25,
    services: ['Cámara LPR', 'Acepta motos'],
    openUntil: 'Abierto hasta 22:00',
    acceptsReservations: false,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: [],
    reservationRules: null,
    coordinate: { latitude: -34.5609, longitude: -58.4491 },
  },
  {
    id: 'microcentro-sur',
    name: 'Garage Microcentro Sur',
    address: 'Tte. Gral. Perón 820',
    distance: '2,1 km',
    eta: '12 min',
    priceLabel: '$2.400/h',
    hourlyPriceArs: 2400,
    rating: '4.6',
    availableSpots: 4,
    totalSpots: 30,
    services: ['Reserva anticipada', 'Lavado'],
    openUntil: 'Abierto 24 h',
    acceptsReservations: true,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: [],
    reservationRules: null,
    coordinate: { latitude: -34.6056, longitude: -58.3782 },
  },
  {
    id: 'almagro-italiano',
    name: 'Parking Almagro',
    address: 'Gascón 520',
    distance: '300 m',
    eta: '4 min',
    priceLabel: '$1.900/h',
    hourlyPriceArs: 1900,
    rating: '4.5',
    availableSpots: 18,
    totalSpots: 24,
    services: ['Reserva anticipada', 'Acepta motos'],
    openUntil: 'Abierto hasta 23:00',
    acceptsReservations: true,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: [],
    reservationRules: null,
    coordinate: { latitude: -34.6064, longitude: -58.4238 },
  },
  {
    id: 'palermo-soho',
    name: 'Cochera Palermo Soho',
    address: 'Gorriti 4850',
    distance: '200 m',
    eta: '3 min',
    priceLabel: '$2.600/h',
    hourlyPriceArs: 2600,
    rating: '4.7',
    availableSpots: 1,
    totalSpots: 30,
    services: ['Reserva anticipada', 'Techado'],
    openUntil: 'Abierto hasta 02:00',
    acceptsReservations: true,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: [],
    reservationRules: null,
    coordinate: { latitude: -34.5897, longitude: -58.4312 },
  },
  {
    id: 'recoleta-pueyrredon',
    name: 'Garage Recoleta',
    address: 'Av. Pueyrredón 1850',
    distance: '900 m',
    eta: '11 min',
    priceLabel: '$2.900/h',
    hourlyPriceArs: 2900,
    rating: '4.8',
    availableSpots: 9,
    totalSpots: 30,
    services: ['Reserva anticipada', 'Techado', 'Lavado'],
    openUntil: 'Abierto 24 h',
    acceptsReservations: true,
    openNow: true,
    schedules: [],
    reservationMaxDaysAhead: 7,
    reservationHours: [],
    reservationVehicleCategories: [],
    reservationRules: null,
    coordinate: { latitude: -34.5889, longitude: -58.3966 },
  },
];
