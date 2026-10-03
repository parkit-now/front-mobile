import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/client';
import type { DriverVehicle } from '../vehicles';
import { createVehicle, toDriverVehicle, updateVehicle } from './vehicles';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

const request = vi.mocked(apiRequest);

const ROW = {
  id: 'v-1',
  plate: 'AB123CD',
  category: 'pickup' as const,
  brand: null,
  model: 'Hilux',
  isPrimary: true,
  hasActiveReservation: false,
  createdAt: '2026-10-03T12:00:00.000Z',
};

const CURRENT: DriverVehicle = {
  id: 'v-1',
  plate: 'AB123CD',
  category: 'pickup',
  brand: '',
  model: 'Hilux',
  isPrimary: false,
};

describe('vehículos del conductor', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue(ROW);
  });

  it('conserva la categoría y deja marca/modelo vacíos en vez de null', () => {
    expect(toDriverVehicle(ROW)).toEqual({
      id: 'v-1',
      plate: 'AB123CD',
      category: 'pickup',
      brand: '',
      model: 'Hilux',
      isPrimary: true,
    });
  });

  it('al crear normaliza la patente y manda null en lo vacío', async () => {
    await createVehicle(
      {
        plate: 'ab-123 cd',
        category: 'motorcycle',
        brand: '  ',
        model: 'Wave',
      },
      true,
      'token',
    );
    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/driver/vehicles',
      body: {
        plate: 'AB123CD',
        category: 'motorcycle',
        brand: null,
        model: 'Wave',
        isPrimary: true,
      },
      bearer: 'token',
    });
  });

  it('al editar sólo manda patente y categoría si cambiaron', async () => {
    await updateVehicle(
      CURRENT,
      {
        plate: 'AB 123 CD',
        category: 'pickup',
        brand: 'Toyota',
        model: 'Hilux',
      },
      false,
      'token',
    );
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: '/driver/vehicles/v-1',
        body: { brand: 'Toyota', model: 'Hilux' },
      }),
    );

    await updateVehicle(
      CURRENT,
      { plate: 'AC456DE', category: 'car', brand: '', model: '' },
      true,
      'token',
    );
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        body: {
          plate: 'AC456DE',
          category: 'car',
          brand: null,
          model: null,
          isPrimary: true,
        },
      }),
    );
  });
});
