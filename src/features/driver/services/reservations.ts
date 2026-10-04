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

export type CreatedReservation = {
  booking: Booking;
  /** Donde paga el conductor; `null` si ya no hay nada que pagar. */
  checkoutUrl: string | null;
  holdExpiresAt: string | null;
};

type CheckoutResponse = components['schemas']['CreateReservationResponseDto'];
export type CancelPreview = components['schemas']['CancelPreviewDto'];

function toCreated(response: CheckoutResponse): CreatedReservation {
  return {
    booking: toBooking(response.reservation),
    checkoutUrl: response.payment.checkoutUrl,
    holdExpiresAt: response.payment.holdExpiresAt,
  };
}

/**
 * Crea la reserva (`pending_payment`) y devuelve el checkout. `returnUrl` es a
 * dónde vuelve el conductor después de pagar (ver reservationLinks.ts).
 */
export async function createReservation(
  input: {
    id: string;
    parkingId: string;
    vehiclePlate: string;
    entryAt: string;
    exitAt: string;
    returnUrl: string;
  },
  bearer: string,
): Promise<CreatedReservation> {
  const body: CreateReservationDto = input;
  return toCreated(
    await apiRequest<CheckoutResponse>({
      method: 'POST',
      path: '/driver/reservations',
      body,
      bearer,
    }),
  );
}

export async function getReservation(
  reservationId: string,
  bearer: string,
): Promise<Booking> {
  return toBooking(
    await apiRequest<ReservationDto>({
      method: 'GET',
      path: `/driver/reservations/${reservationId}`,
      bearer,
    }),
  );
}

/** Reintento de pago: el mismo checkout si sigue vivo, uno nuevo si se rechazó. */
export async function retryReservationPayment(
  reservationId: string,
  bearer: string,
): Promise<CreatedReservation> {
  return toCreated(
    await apiRequest<CheckoutResponse>({
      method: 'POST',
      path: `/driver/reservations/${reservationId}/payment`,
      bearer,
    }),
  );
}

export async function listReservations(bearer: string): Promise<Booking[]> {
  const rows = await apiRequest<ReservationDto[]>({
    method: 'GET',
    path: '/driver/reservations',
    bearer,
  });
  return rows.map(toBooking);
}

/** Cuánto se devolvería si se cancelara ahora. */
export function previewCancel(
  reservationId: string,
  bearer: string,
): Promise<CancelPreview> {
  return apiRequest<CancelPreview>({
    method: 'GET',
    path: `/driver/reservations/${reservationId}/cancel-preview`,
    bearer,
  });
}

export const CANCEL_TIMEOUT_MS = 45_000;

export async function cancelReservation(
  reservationId: string,
  bearer: string,
): Promise<Booking> {
  const row = await apiRequest<ReservationDto>({
    method: 'POST',
    path: `/driver/reservations/${reservationId}/cancel`,
    bearer,
    // El reembolso en Mercado Pago puede tardar.
    timeoutMs: CANCEL_TIMEOUT_MS,
  });
  return toBooking(row);
}

// El detalle completo del backend (o un subconjunto con estos campos).
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
  | 'status'
  | 'refundStatus'
  | 'refundedAmountArs'
  | 'policy'
  | 'holdExpiresAt'
  | 'approvalDeadlineAt'
  | 'payment'
  | 'cancelledBy'
  | 'reason'
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
    exitAt: row.exitAt,
    status: row.state,
    lifecycle: row.status,
    ticketCode: row.code,
    priceLabel: `$${row.totalArs.toLocaleString('es-AR')}`,
    totalArs: row.totalArs,
    vehiclePlate: row.vehiclePlate,
    cancellable: row.cancellable,
    refundStatus: row.refundStatus,
    refundedAmountArs: row.refundedAmountArs,
    cancelledBy:
      row.cancelledBy === 'driver' ||
      row.cancelledBy === 'owner' ||
      row.cancelledBy === 'system'
        ? row.cancelledBy
        : null,
    reason: row.reason,
    holdExpiresAt: row.holdExpiresAt,
    approvalDeadlineAt: row.approvalDeadlineAt,
    paymentStatus: row.payment?.status ?? null,
    checkoutUrl: row.payment?.checkoutUrl ?? null,
    policy: {
      freeCancelMinutes: row.policy.freeCancelMinutes,
      lateCancelRefundPct: row.policy.lateCancelRefundPct,
      earlyArrivalMinutes: row.policy.earlyArrivalMinutes,
      graceMinutes: row.policy.graceMinutes,
      acceptanceMode: row.policy.acceptanceMode,
      approvalWindowMinutes: row.policy.approvalWindowMinutes,
    },
    coordinate: {
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
    },
  };
}
