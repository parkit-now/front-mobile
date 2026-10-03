import type { components } from '../../generated/api-types';
import type { DriverIconName } from './components/DriverIcon';
import type { Booking } from './mock';

// Categoría de la plataforma (GET /vehicle-categories). El conductor sólo puede
// guardar las reservables; el vehículo puede traer cualquiera.
export type VehicleCategory = components['schemas']['VehicleCategory'];
export type ReservableCategory =
  components['schemas']['ReservableVehicleCategory'];

export type VehicleCategoryOption = {
  code: VehicleCategory;
  label: string;
};

export type ReservableCategoryOption = VehicleCategoryOption & {
  code: ReservableCategory;
};

// Respaldo si no carga /vehicle-categories: las reservables, en el orden y con
// las etiquetas de la plataforma.
export const FALLBACK_RESERVABLE_CATEGORIES: ReservableCategoryOption[] = [
  { code: 'car', label: 'Auto' },
  { code: 'suv', label: 'SUV' },
  { code: 'pickup', label: 'Pickup' },
  { code: 'van', label: 'Utilitario / Van' },
  { code: 'motorcycle', label: 'Moto' },
];

const RESERVABLE_CODES = new Set<string>(
  FALLBACK_RESERVABLE_CATEGORIES.map((option) => option.code),
);

export function isReservableCategory(code: string): code is ReservableCategory {
  return RESERVABLE_CODES.has(code);
}

const FALLBACK_LABELS: Record<VehicleCategory, string> = {
  car: 'Auto',
  suv: 'SUV',
  pickup: 'Pickup',
  van: 'Utilitario / Van',
  motorcycle: 'Moto',
  bicycle: 'Bici',
  truck: 'Camión',
  other: 'Otro',
};

export function categoryLabel(
  code: VehicleCategory,
  categories: VehicleCategoryOption[] = [],
): string {
  return (
    categories.find((option) => option.code === code)?.label ??
    FALLBACK_LABELS[code] ??
    code
  );
}

// Vehículo del conductor, guardado en el backend (/driver/vehicles).
export type DriverVehicle = {
  id: string;
  plate: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  isPrimary: boolean;
};

export type VehicleDraft = Omit<
  DriverVehicle,
  'id' | 'isPrimary' | 'category'
> & {
  category: ReservableCategory;
};

export type VehicleField = 'plate' | 'category';
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

export function describeVehicle(
  vehicle: DriverVehicle,
  categories: VehicleCategoryOption[] = [],
): string {
  const label = categoryLabel(vehicle.category, categories);
  const name = [vehicle.brand, vehicle.model]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  return name ? `${label} · ${name}` : label;
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

// Ícono de la categoría; las que no tienen uno propio usan el del auto.
export function vehicleIconName(category: VehicleCategory): DriverIconName {
  switch (category) {
    case 'motorcycle':
      return 'moto';
    case 'suv':
      return 'suv';
    case 'pickup':
      return 'pickup';
    case 'van':
    case 'truck':
      return 'van';
    default:
      return 'car';
  }
}

// ─── Vehículos aceptados por un estacionamiento ─────────────────────────────

const PLURAL_LABELS: Record<VehicleCategory, string> = {
  car: 'autos',
  suv: 'SUV',
  pickup: 'pickups',
  van: 'utilitarios',
  motorcycle: 'motos',
  bicycle: 'bicis',
  truck: 'camiones',
  other: 'otros vehículos',
};

/** Los vehículos del conductor que el estacionamiento acepta para reservar. */
export function acceptedVehicles(
  vehicles: DriverVehicle[],
  accepted: readonly string[],
): DriverVehicle[] {
  return vehicles.filter((vehicle) => accepted.includes(vehicle.category));
}

/**
 * Aviso cuando el conductor tiene vehículos pero ninguno sirve para reservar
 * ahí ("Este estacionamiento no toma reservas para motos"). `null` si alguno
 * sirve o si no cargó ninguno (ese caso ya tiene su propio texto).
 */
export function unacceptedVehicleNotice(
  vehicles: DriverVehicle[],
  accepted: readonly string[],
): string | null {
  if (vehicles.length === 0) return null;
  if (acceptedVehicles(vehicles, accepted).length > 0) return null;
  const kinds = [
    ...new Set(vehicles.map((vehicle) => PLURAL_LABELS[vehicle.category])),
  ];
  const list =
    kinds.length > 1
      ? `${kinds.slice(0, -1).join(', ')} ni ${kinds[kinds.length - 1]}`
      : kinds[0];
  return `Este estacionamiento no toma reservas para ${list}.`;
}

/** "Autos y SUV": lo que acepta el estacionamiento, para el detalle. */
export function acceptedCategoriesLabel(
  accepted: readonly string[],
  categories: VehicleCategoryOption[] = [],
): string {
  return accepted
    .map((code) => categoryLabel(code as VehicleCategory, categories))
    .join(' · ');
}
