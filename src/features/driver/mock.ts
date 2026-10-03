// Categoría del vehículo del conductor. Es un dato del vehículo: la reserva se
// cobra con la tarifa de reservas de la playa, igual para cualquier vehículo.
export type VehicleKind = 'Auto' | 'Camioneta' | 'Moto';

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
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export type BookingStatus = 'active' | 'completed' | 'cancelled';

/** Fecha y hora de un extremo de la reserva, ya formateadas en hora argentina. */
export type BookingMoment = { dateLabel: string; timeLabel: string };

export type Booking = {
  id: string;
  parkingName: string;
  address: string;
  /** ISO del ingreso, para ordenar. */
  entryAt: string;
  /** Ingreso y egreso por separado: la estadía puede terminar otro día. */
  entry: BookingMoment;
  exit: BookingMoment;
  status: BookingStatus;
  ticketCode: string;
  priceLabel: string;
  vehiclePlate: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export const VEHICLE_KINDS: VehicleKind[] = ['Auto', 'Camioneta', 'Moto'];

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
    coordinate: { latitude: -34.5889, longitude: -58.3966 },
  },
];
