import type { ParkingLot, VehicleKind } from './mock';

type ParkingFilters = {
  query: string;
  vehicleKind: VehicleKind;
  reservationsOnly: boolean;
};

export function filterParkingLots(
  parkingLots: ParkingLot[],
  { query, vehicleKind, reservationsOnly }: ParkingFilters,
): ParkingLot[] {
  const normalizedQuery = normalizeSearch(query);

  return parkingLots.filter((parking) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [parking.name, parking.address, ...parking.services].some((value) =>
        normalizeSearch(value).includes(normalizedQuery),
      );
    const matchesVehicle = parking.supportedVehicles.includes(vehicleKind);
    const matchesReservation = !reservationsOnly || parking.acceptsReservations;

    return matchesQuery && matchesVehicle && matchesReservation;
  });
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-AR');
}
