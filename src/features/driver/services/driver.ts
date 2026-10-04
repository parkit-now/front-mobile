import type { components } from '../../../generated/api-types';
import { apiRequest } from '../../../lib/api/client';
import type { ParkingLot, ParkingSchedule } from '../mock';

type NearbyDto = components['schemas']['DriverNearbyParkingDto'];
type DetailDto = components['schemas']['DriverParkingDetailDto'];
type SearchDto = components['schemas']['DriverParkingSearchResultDto'];
type CreateQuoteDto = components['schemas']['CreateQuoteDto'];
export type DriverQuote = components['schemas']['QuoteDto'];

export async function fetchNearbyParkings(
  center: { latitude: number; longitude: number },
  bearer: string,
): Promise<ParkingLot[]> {
  const query = new URLSearchParams({
    latitude: String(center.latitude),
    longitude: String(center.longitude),
    radiusMeters: '5000',
  });
  const rows = await apiRequest<NearbyDto[]>({
    method: 'GET',
    path: `/driver/parkings?${query.toString()}`,
    bearer,
  });
  return rows.map(mapParking);
}

/**
 * Busca estacionamientos por nombre (GET /driver/parkings/search). Devuelve la
 * misma forma que el listado cercano. `coords` es opcional: con ella el backend
 * calcula la distancia.
 */
export async function searchParkingsByName(
  q: string,
  bearer: string,
  coords?: { latitude: number; longitude: number },
): Promise<ParkingLot[]> {
  const query = new URLSearchParams({ q });
  if (coords) {
    query.set('latitude', String(coords.latitude));
    query.set('longitude', String(coords.longitude));
  }
  const rows = await apiRequest<SearchDto[]>({
    method: 'GET',
    path: `/driver/parkings/search?${query.toString()}`,
    bearer,
  });
  // Sin distancia (sin ubicación o playa sin coordenadas) no se muestra.
  return rows.map((row) => ({
    ...mapParking(row),
    ...(row.distanceMeters === null ? { distance: '' } : {}),
  }));
}

export async function fetchParkingDetail(
  parkingId: string,
  bearer: string,
): Promise<ParkingLot> {
  const row = await apiRequest<DetailDto>({
    method: 'GET',
    path: `/driver/parkings/${parkingId}`,
    bearer,
  });
  return mapParking(row);
}

export function fetchParkingQuote(
  parkingId: string,
  input: { entryAt: string; exitAt: string },
  bearer: string,
): Promise<DriverQuote> {
  const body: CreateQuoteDto = {
    entryAt: input.entryAt,
    exitAt: input.exitAt,
  };
  return apiRequest<DriverQuote>({
    method: 'POST',
    path: `/driver/parkings/${parkingId}/quote`,
    body,
    bearer,
  });
}

function mapParking(row: NearbyDto | DetailDto | SearchDto): ParkingLot {
  const hourlyPriceArs = row.reservationHourPriceArs ?? 0;
  const distanceMeters =
    'distanceMeters' in row && typeof row.distanceMeters === 'number'
      ? row.distanceMeters
      : 0;
  const schedules: ParkingSchedule[] = 'schedules' in row ? row.schedules : [];

  return {
    id: row.id,
    name: row.name,
    address: row.address
      ? displayAddress(row.address)
      : 'Dirección no informada',
    distance: formatDistance(distanceMeters),
    eta: `${Math.max(1, Math.round(distanceMeters / 75))} min`,
    priceLabel: formatHourlyPrice(hourlyPriceArs),
    hourlyPriceArs,
    rating: '—',
    availableSpots: row.availableSpots,
    totalSpots: row.totalSpots,
    services: row.acceptsReservations ? ['Reserva anticipada'] : [],
    openUntil: openStatusLabel(row.openNow),
    acceptsReservations: row.acceptsReservations,
    openNow: row.openNow,
    schedules,
    reservationMaxDaysAhead:
      'reservationMaxDaysAhead' in row ? row.reservationMaxDaysAhead : 7,
    reservationHours: row.reservationHours ?? [],
    reservationVehicleCategories: row.reservationVehicleCategories ?? [],
    reservationRules: row.reservationRules ?? null,
    coordinate: { latitude: row.latitude, longitude: row.longitude },
  };
}

function formatHourlyPrice(price: number): string {
  return price > 0 ? `$${price.toLocaleString('es-AR')}/h` : 'Sin tarifa';
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('es-AR', {
    maximumFractionDigits: 1,
  })} km`;
}

function openStatusLabel(openNow: boolean | null): string {
  if (openNow === null) return 'Horario no informado';
  return openNow ? 'Abierto ahora' : 'Cerrado ahora';
}

const LOWERCASE_WORDS = new Set(['de', 'del', 'y', 'e']);
// "Las Heras", "Los Andes": el artículo va en mayúscula salvo después de
// "de"/"del" ("Paseo de la Recoleta").
const ARTICLES = new Set(['la', 'las', 'los', 'el']);
const ABBREVIATIONS: Record<string, string> = {
  av: 'Av.',
  avda: 'Av.',
  gral: 'Gral.',
  pte: 'Pte.',
  dr: 'Dr.',
};

/**
 * Dirección legible para el conductor. Las playas geocodificadas guardan la
 * `nomenclatura` de Georef ("BARTOLOME MITRE 2500, Comuna 3, Ciudad Autónoma
 * de Buenos Aires"): se deja calle y altura y se pasa a tipo título. Las
 * cargadas a mano ya vienen escritas por una persona y no se tocan.
 */
export function displayAddress(raw: string): string {
  const [street] = raw.split(',');
  const trimmed = street.trim();
  if (trimmed !== trimmed.toUpperCase()) return raw.trim();
  return trimmed
    .toLocaleLowerCase('es-AR')
    .split(/\s+/)
    .map((word, index, words) => {
      if (ABBREVIATIONS[word]) return ABBREVIATIONS[word];
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      if (
        index > 0 &&
        ARTICLES.has(word) &&
        (words[index - 1] === 'de' || words[index - 1] === 'del')
      ) {
        return word;
      }
      return word.charAt(0).toLocaleUpperCase('es-AR') + word.slice(1);
    })
    .join(' ');
}
