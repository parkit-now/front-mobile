import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/client';
import { listVehicleCatalog, resetVehicleCatalogCache } from './vehicleCatalog';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);

const ROWS = [{ brand: 'Toyota', model: 'Etios', category: 'car' as const }];

describe('catálogo de vehículos', () => {
  beforeEach(() => {
    request.mockReset();
    resetVehicleCatalogCache();
  });

  it('lo pide una sola vez y reutiliza la respuesta', async () => {
    request.mockResolvedValue(ROWS);

    expect(await listVehicleCatalog('token')).toEqual(ROWS);
    expect(await listVehicleCatalog('token')).toEqual(ROWS);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/driver/vehicle-catalog',
      bearer: 'token',
    });
  });

  it('si falla no guarda el error: el reintento vuelve a pedirlo', async () => {
    request.mockRejectedValueOnce(new Error('sin red'));
    await expect(listVehicleCatalog('token')).rejects.toThrow('sin red');

    request.mockResolvedValue(ROWS);
    expect(await listVehicleCatalog('token')).toEqual(ROWS);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
