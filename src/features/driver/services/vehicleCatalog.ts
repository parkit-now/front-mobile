import type { components } from '../../../generated/api-types';
import { apiRequest } from '../../../lib/api/client';
import type { CatalogItem } from '../vehicleCatalog';

type CatalogItemDto = components['schemas']['DriverVehicleCatalogItemDto'];

// Unas 1.200 filas que sólo cambian por migración: se piden una vez por sesión
// de la app, recién cuando el conductor abre el buscador.
let cached: Promise<CatalogItem[]> | null = null;

export function listVehicleCatalog(bearer: string): Promise<CatalogItem[]> {
  cached ??= apiRequest<CatalogItemDto[]>({
    method: 'GET',
    path: '/driver/vehicle-catalog',
    bearer,
  }).catch((error: unknown) => {
    // Un fallo no queda guardado: el próximo intento vuelve a pedirlo.
    cached = null;
    throw error;
  });
  return cached;
}

/** Sólo para tests: olvida el catálogo guardado. */
export function resetVehicleCatalogCache(): void {
  cached = null;
}
