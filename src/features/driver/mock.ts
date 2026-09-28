export type VehicleKind = 'Auto' | 'Moto' | 'Pickup';

export type ParkingLot = {
  id: string;
  name: string;
  address: string;
  distance: string;
  eta: string;
  priceLabel: string;
  hourlyPriceArs: number;
  rating: string;
  availableSpots: number;
  services: string[];
  openUntil: string;
  supportedVehicles: VehicleKind[];
  acceptsReservations: boolean;
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export type BookingStatus = 'active' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  parkingName: string;
  address: string;
  dateLabel: string;
  timeLabel: string;
  status: BookingStatus;
  ticketCode: string;
  priceLabel: string;
};

export const VEHICLE_KINDS: VehicleKind[] = ['Auto', 'Moto', 'Pickup'];

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
    services: ['Reserva anticipada', 'Techado', '24 h'],
    openUntil: 'Abierto hasta 23:30',
    supportedVehicles: ['Auto', 'Moto', 'Pickup'],
    acceptsReservations: true,
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
    services: ['Cámara LPR', 'Acepta motos'],
    openUntil: 'Abierto hasta 22:00',
    supportedVehicles: ['Auto', 'Moto'],
    acceptsReservations: false,
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
    services: ['Reserva anticipada', 'Lavado'],
    openUntil: 'Abierto 24 h',
    supportedVehicles: ['Auto', 'Pickup'],
    acceptsReservations: true,
    coordinate: { latitude: -34.6056, longitude: -58.3782 },
  },
];

export const BOOKINGS: Booking[] = [
  {
    id: 'booking-001',
    parkingName: 'Estacionamiento Once',
    address: 'Av. Rivadavia 2850',
    dateLabel: 'Hoy',
    timeLabel: '18:30 - 20:30',
    status: 'active',
    ticketCode: 'PKT-4821',
    priceLabel: '$3.600',
  },
  {
    id: 'booking-002',
    parkingName: 'Belgrano Norte Parking',
    address: 'Mendoza 1712',
    dateLabel: 'Ayer',
    timeLabel: '09:00 - 11:00',
    status: 'completed',
    ticketCode: 'PKT-3270',
    priceLabel: '$4.200',
  },
  {
    id: 'booking-003',
    parkingName: 'Garage Microcentro Sur',
    address: 'Tte. Gral. Perón 820',
    dateLabel: '10 sep',
    timeLabel: '14:00 - 15:00',
    status: 'cancelled',
    ticketCode: 'PKT-1904',
    priceLabel: '$0',
  },
];
