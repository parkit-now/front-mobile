import type { components } from '../../../generated/api-types';
import { apiRequest } from '../../../lib/api/client';
import type { Booking } from '../mock';
import { displayAddress } from './driver';

type ReservationDto = components['schemas']['DriverReservationDetailDto'];
type CreateReservationDto = components['schemas']['CreateReservationDto'];

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * UUID v4 para la clave de idempotencia del POST. Se genera UNA vez por intento
 * de reserva (al abrir el modal): si el celular reintenta, el backend devuelve
 * la misma reserva en vez de duplicarla. No es un secreto, así que alcanza con
 * Math.random.
 */
export function newReservationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function createReservation(
  input: {
    id: string;
    parkingId: string;
    vehiclePlate: string;
    entryAt: string;
    exitAt: string;
  },
  bearer: string,
): Promise<Booking> {
  const body: CreateReservationDto = input;
  const row = await apiRequest<ReservationDto>({
    method: 'POST',
    path: '/driver/reservations',
    body,
    bearer,
  });
  return toBooking(row);
}

export async function listReservations(bearer: string): Promise<Booking[]> {
  const rows = await apiRequest<ReservationDto[]>({
    method: 'GET',
    path: '/driver/reservations',
    bearer,
  });
  return rows.map(toBooking);
}

export async function cancelReservation(
  reservationId: string,
  bearer: string,
): Promise<Booking> {
  const row = await apiRequest<ReservationDto>({
    method: 'POST',
    path: `/driver/reservations/${reservationId}/cancel`,
    bearer,
  });
  return toBooking(row);
}

// Sólo los campos que muestra la app; el resto (pago, política) es de la fase 4.
type ReservationRow = Pick<
  ReservationDto,
  | 'id'
  | 'code'
  | 'state'
  | 'cancellable'
  | 'parkingName'
  | 'parkingAddress'
  | 'latitude'
  | 'longitude'
  | 'vehiclePlate'
  | 'entryAt'
  | 'exitAt'
  | 'totalArs'
>;

export function toBooking(row: ReservationRow): Booking {
  const entry = new Date(row.entryAt);
  const exit = new Date(row.exitAt);
  const day = new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return {
    id: row.id,
    parkingName: row.parkingName,
    address: row.parkingAddress
      ? displayAddress(row.parkingAddress)
      : 'Dirección no informada',
    entryAt: row.entryAt,
    entry: { dateLabel: day.format(entry), timeLabel: time.format(entry) },
    exit: { dateLabel: day.format(exit), timeLabel: time.format(exit) },
    status: row.state,
    ticketCode: row.code,
    priceLabel: `$${row.totalArs.toLocaleString('es-AR')}`,
    vehiclePlate: row.vehiclePlate,
    cancellable: row.cancellable,
    coordinate: {
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
    },
  };
}
