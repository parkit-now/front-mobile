import type { Booking, VehicleKind } from './mock';

// Vehículo del conductor, guardado en el backend (/driver/vehicles). La
// categoría se muestra como Auto / Camioneta / Moto; services/vehicles.ts la
// traduce a la del backend.
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
