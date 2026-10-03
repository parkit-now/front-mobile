import { describe, expect, it, vi } from 'vitest';
import { georefName, mapGeorefAddresses } from './georef';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

describe('georef', () => {
  it('arma nombres legibles para esquinas y direcciones', () => {
    expect(
      georefName(
        'AV CALLAO (ESQUINA AV GRAL LAS HERAS), Comuna 2, Ciudad Autónoma de Buenos Aires',
      ),
    ).toBe('Av. Callao y Av. Gral. Las Heras');
    expect(georefName('AV SANTA FE 3253, Comuna 14, CABA')).toBe(
      'Av. Santa Fe 3253',
    );
  });

  it('deduplica tramos de la misma calle y descarta sin coordenadas', () => {
    const tramo = (lat: number | null) => ({
      nomenclatura: 'AV CABILDO, Comuna 12, Ciudad Autónoma de Buenos Aires',
      ubicacion: { lat, lon: lat === null ? null : -58.47 },
      departamento: { nombre: 'Comuna 12' },
    });
    const result = mapGeorefAddresses([
      tramo(null),
      tramo(-34.54),
      tramo(-34.55),
    ]);
    expect(result).toEqual([
      {
        id: 'georef:Av. Cabildo',
        name: 'Av. Cabildo',
        address: 'Comuna 12, CABA',
        kind: 'address',
        coordinate: { latitude: -34.54, longitude: -58.47 },
      },
    ]);
  });
});
