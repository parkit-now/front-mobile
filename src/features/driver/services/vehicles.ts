import type { components } from '../../../generated/api-types';
import { apiRequest } from '../../../lib/api/client';
import {
  normalizePlate,
  type DriverVehicle,
  type VehicleDraft,
} from '../vehicles';

type VehicleDto = components['schemas']['DriverVehicleDto'];
type CreateVehicleDto = components['schemas']['CreateDriverVehicleDto'];
type UpdateVehicleDto = components['schemas']['UpdateDriverVehicleDto'];

export async function listVehicles(bearer: string): Promise<DriverVehicle[]> {
  const rows = await apiRequest<VehicleDto[]>({
    method: 'GET',
    path: '/driver/vehicles',
    bearer,
  });
  return rows.map(toDriverVehicle);
}

export async function createVehicle(
  draft: VehicleDraft,
  makePrimary: boolean,
  bearer: string,
): Promise<DriverVehicle> {
  const body: CreateVehicleDto = {
    ...toApiDraft(draft),
    isPrimary: makePrimary,
  };
  const row = await apiRequest<VehicleDto>({
    method: 'POST',
    path: '/driver/vehicles',
    body,
    bearer,
  });
  return toDriverVehicle(row);
}

/**
 * Edita el vehículo. Sólo manda patente y categoría si cambiaron: con una
 * reserva activa el backend rechaza tocarlas aunque sea con el mismo valor.
 */
export async function updateVehicle(
  current: DriverVehicle,
  draft: VehicleDraft,
  makePrimary: boolean,
  bearer: string,
): Promise<DriverVehicle> {
  const next = toApiDraft(draft);
  const body: UpdateVehicleDto = {
    brand: next.brand,
    model: next.model,
  };
  if (next.plate !== current.plate) body.plate = next.plate;
  if (next.category !== current.category) body.category = next.category;
  if (makePrimary && !current.isPrimary) body.isPrimary = true;
  const row = await apiRequest<VehicleDto>({
    method: 'PATCH',
    path: `/driver/vehicles/${current.id}`,
    body,
    bearer,
  });
  return toDriverVehicle(row);
}

export async function deleteVehicle(
  vehicleId: string,
  bearer: string,
): Promise<void> {
  await apiRequest<void>({
    method: 'DELETE',
    path: `/driver/vehicles/${vehicleId}`,
    bearer,
  });
}

export function toDriverVehicle(row: VehicleDto): DriverVehicle {
  return {
    id: row.id,
    plate: row.plate,
    category: row.category,
    brand: row.brand ?? '',
    model: row.model ?? '',
    isPrimary: row.isPrimary,
  };
}

function toApiDraft(draft: VehicleDraft) {
  return {
    plate: normalizePlate(draft.plate),
    category: draft.category,
    brand: draft.brand.trim() || null,
    model: draft.model.trim() || null,
  };
}
