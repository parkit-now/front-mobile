import type { components } from '../../../generated/api-types';
import { apiRequest } from '../../../lib/api/client';
import type { VehicleKind } from '../mock';
import {
  normalizePlate,
  type DriverVehicle,
  type VehicleDraft,
} from '../vehicles';

type VehicleDto = components['schemas']['DriverVehicleDto'];
type ApiVehicleKind = components['schemas']['DriverVehicleKind'];
type CreateVehicleDto = components['schemas']['CreateDriverVehicleDto'];
type UpdateVehicleDto = components['schemas']['UpdateDriverVehicleDto'];

const API_KIND_BY_MOBILE: Record<VehicleKind, ApiVehicleKind> = {
  Auto: 'car',
  Camioneta: 'suv_pickup',
  Moto: 'motorcycle',
};

const MOBILE_KIND_BY_API: Record<ApiVehicleKind, VehicleKind> = {
  car: 'Auto',
  suv_pickup: 'Camioneta',
  motorcycle: 'Moto',
};

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
  if (draft.kind !== current.kind) body.kind = next.kind;
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
    kind: MOBILE_KIND_BY_API[row.kind],
    brand: row.brand ?? '',
    model: row.model ?? '',
    isPrimary: row.isPrimary,
  };
}

function toApiDraft(draft: VehicleDraft) {
  return {
    plate: normalizePlate(draft.plate),
    kind: API_KIND_BY_MOBILE[draft.kind],
    brand: draft.brand.trim() || null,
    model: draft.model.trim() || null,
  };
}
