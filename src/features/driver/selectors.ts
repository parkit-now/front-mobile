import type { ParkingLot } from './mock';

type ParkingFilters = {
  query: string;
  reservationsOnly: boolean;
};

export type MapParkingFilters = {
  availableOnly: boolean;
  maxHourlyPriceArs: number | null;
};

export function filterParkingLots(
  parkingLots: ParkingLot[],
  { query, reservationsOnly }: ParkingFilters,
): ParkingLot[] {
  const normalizedQuery = normalizeSearch(query);

  return parkingLots.filter((parking) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [parking.name, parking.address, ...parking.services].some((value) =>
        normalizeSearch(value).includes(normalizedQuery),
      );
    const matchesReservation = !reservationsOnly || parking.acceptsReservations;

    return matchesQuery && matchesReservation;
  });
}

export function filterMapParkingLots<TParking extends ParkingLot>(
  parkingLots: TParking[],
  { availableOnly, maxHourlyPriceArs }: MapParkingFilters,
): TParking[] {
  return parkingLots.filter((parking) => {
    const matchesAvailability =
      !availableOnly ||
      (parking.availableSpots !== null && parking.availableSpots > 0);
    const matchesPrice =
      maxHourlyPriceArs === null || parking.hourlyPriceArs <= maxHourlyPriceArs;

    return matchesAvailability && matchesPrice;
  });
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-AR');
}

export type PriceSliderBounds = {
  min: number;
  max: number;
  step: number;
};

const PRICE_SLIDER_STEP_ARS = 100;

// Rango del slider de precio máximo a partir de los resultados: de la cochera
// más barata a la más cara, redondeado a $100. null si no hay nada que filtrar
// (menos de dos cocheras o todas al mismo precio).
export function priceSliderBounds(
  parkingLots: Pick<ParkingLot, 'hourlyPriceArs'>[],
): PriceSliderBounds | null {
  const prices = parkingLots
    .map((parking) => parking.hourlyPriceArs)
    .filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length < 2) return null;

  const step = PRICE_SLIDER_STEP_ARS;
  const min = Math.floor(Math.min(...prices) / step) * step;
  const max = Math.ceil(Math.max(...prices) / step) * step;
  return min === max ? null : { min, max, step };
}

// Posición del dedo sobre la barra (0..width) → precio, ajustado al paso.
export function priceAtPosition(
  position: number,
  width: number,
  { min, max, step }: PriceSliderBounds,
): number {
  if (width <= 0) return max;
  const ratio = Math.min(Math.max(position / width, 0), 1);
  return Math.round((min + ratio * (max - min)) / step) * step;
}
