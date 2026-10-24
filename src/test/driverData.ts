import { vi } from 'vitest';
import type { useDriverData } from '../features/driver/hooks/useDriverData';
import {
  FALLBACK_RESERVABLE_CATEGORIES,
  type DriverVehicle,
} from '../features/driver/vehicles';

type DriverData = ReturnType<typeof useDriverData>;

export function makeVehicle(
  overrides: Partial<DriverVehicle> = {},
): DriverVehicle {
  return {
    id: 'v-1',
    plate: 'AB123CD',
    category: 'car',
    brand: 'Toyota',
    model: 'Etios',
    isPrimary: true,
    ...overrides,
  };
}

/**
 * Valor falso del contexto de `useDriverData` para las pantallas. Los tests lo
 * inyectan con
 * `vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => data }))`.
 */
export function makeDriverData(
  overrides: Partial<DriverData> = {},
): DriverData {
  return {
    accessToken: 'token',
    bookings: [],
    bookingsStatus: 'success',
    refreshBookings: vi.fn(() => Promise.resolve()),
    vehicles: [],
    vehiclesStatus: 'success',
    refreshVehicles: vi.fn(() => Promise.resolve()),
    vehicleCategories: FALLBACK_RESERVABLE_CATEGORIES,
    createReservation: vi.fn(),
    reloadBooking: vi.fn(),
    retryPayment: vi.fn(),
    // Sin respuesta: la hoja de cancelación queda calculando el reembolso.
    previewCancel: vi.fn(() => new Promise<never>(() => {})),
    cancelReservation: vi.fn(),
    applyBooking: vi.fn(),
    saveVehicle: vi.fn(() => Promise.resolve()),
    removeVehicle: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}
