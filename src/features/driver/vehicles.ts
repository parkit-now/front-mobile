import type { Booking, VehicleKind } from './mock';

// Vehículo del conductor. Vive en memoria hasta que exista el endpoint del
// conductor; los nombres (`plate`, `brand`, `model`) siguen al backend.
export type DriverVehicle = {
  id: string;
  plate: string;
  kind: VehicleKind;
  brand: string;
  model: string;
  isPrimary: boolean;
};

export type VehicleDraft = Omit<DriverVehicle, 'id' | 'isPrimary'>;

export type VehicleField = 'plate' | 'kind';
export type VehicleFieldErrors = Partial<Record<VehicleField, string>>;

// Formatos argentinos vigentes, con el agrupado que se usa al mostrarlos.
const PLATE_FORMATS: Array<{ pattern: RegExp; groups: number[] }> = [
  { pattern: /^[A-Z]{2}\d{3}[A-Z]{2}$/, groups: [2, 3, 2] }, // Mercosur auto
  { pattern: /^[A-Z]{3}\d{3}$/, groups: [3, 3] }, // auto anterior
  { pattern: /^[A-Z]\d{3}[A-Z]{3}$/, groups: [1, 3, 3] }, // Mercosur moto
  { pattern: /^\d{3}[A-Z]{3}$/, groups: [3, 3] }, // moto anterior
];

export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidPlate(value: string): boolean {
  const plate = normalizePlate(value);
  return PLATE_FORMATS.some(({ pattern }) => pattern.test(plate));
}

export function formatPlate(value: string): string {
  const plate = normalizePlate(value);
  const format = PLATE_FORMATS.find(({ pattern }) => pattern.test(plate));
  if (!format) return plate;

  let start = 0;
  return format.groups
    .map((length) => {
      const group = plate.slice(start, start + length);
      start += length;
      return group;
    })
    .join(' ');
}

export function describeVehicle(vehicle: DriverVehicle): string {
  const name = [vehicle.brand, vehicle.model]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  return name ? `${vehicle.kind} · ${name}` : vehicle.kind;
}

export function validateVehicle(
  draft: VehicleDraft,
  vehicles: DriverVehicle[],
  editingId: string | null = null,
): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {};
  const plate = normalizePlate(draft.plate);

  if (!plate) {
    errors.plate = 'Ingresá la patente';
  } else if (!isValidPlate(plate)) {
    errors.plate = 'Usá un formato válido, como AB 123 CD o ABC 123';
  } else if (
    vehicles.some(
      (vehicle) => vehicle.id !== editingId && vehicle.plate === plate,
    )
  ) {
    errors.plate = 'Ya tenés un vehículo con esta patente';
  }

  return errors;
}

export function getPrimaryVehicle(
  vehicles: DriverVehicle[],
): DriverVehicle | null {
  return vehicles.find((vehicle) => vehicle.isPrimary) ?? null;
}

// Invariante: si hay vehículos, exactamente uno es el principal. El primero
// que se agrega lo es siempre; los demás, solo si el usuario lo pide.
export function addVehicle(
  vehicles: DriverVehicle[],
  draft: VehicleDraft,
  { id, makePrimary }: { id: string; makePrimary: boolean },
): DriverVehicle[] {
  const isPrimary = makePrimary || vehicles.length === 0;
  const added: DriverVehicle = {
    ...draft,
    id,
    plate: normalizePlate(draft.plate),
    isPrimary,
  };
  const current = isPrimary
    ? vehicles.map((vehicle) => ({ ...vehicle, isPrimary: false }))
    : vehicles;

  return [...current, added];
}

export function updateVehicle(
  vehicles: DriverVehicle[],
  id: string,
  draft: VehicleDraft,
): DriverVehicle[] {
  return vehicles.map((vehicle) =>
    vehicle.id === id
      ? { ...vehicle, ...draft, plate: normalizePlate(draft.plate) }
      : vehicle,
  );
}

export function setPrimaryVehicle(
  vehicles: DriverVehicle[],
  id: string,
): DriverVehicle[] {
  if (!vehicles.some((vehicle) => vehicle.id === id)) return vehicles;
  return vehicles.map((vehicle) => ({
    ...vehicle,
    isPrimary: vehicle.id === id,
  }));
}

// Si se borra el principal, pasa a serlo el primero que queda.
export function removeVehicle(
  vehicles: DriverVehicle[],
  id: string,
): DriverVehicle[] {
  const removed = vehicles.find((vehicle) => vehicle.id === id);
  const remaining = vehicles.filter((vehicle) => vehicle.id !== id);
  if (!removed?.isPrimary || remaining.length === 0) return remaining;

  return remaining.map((vehicle, index) => ({
    ...vehicle,
    isPrimary: index === 0,
  }));
}

// Vehículo sugerido para reservar: el principal, o el primero si no hay.
export function pickReservationVehicle(
  vehicles: DriverVehicle[],
): DriverVehicle | null {
  return vehicles.find((vehicle) => vehicle.isPrimary) ?? vehicles[0] ?? null;
}

// La cámara del estacionamiento busca la reserva por patente: mientras haya
// una reserva activa con este vehículo no se puede cambiar su patente ni su
// tipo, ni eliminarlo. Las reservas guardan su propia copia de la patente, así
// que editar el vehículo nunca reescribe el historial.
export function hasActiveReservation(
  vehicle: DriverVehicle,
  bookings: Booking[],
): boolean {
  return bookings.some(
    (booking) =>
      booking.status === 'active' && booking.vehiclePlate === vehicle.plate,
  );
}
