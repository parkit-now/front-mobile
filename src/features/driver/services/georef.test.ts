import { describe, expect, it, vi } from 'vitest';
import {
  georefName,
  isWholeStreet,
  mapGeorefAddresses,
  normalizeGeorefQuery,
} from './georef';

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
        kind: 'street',
        coordinate: { latitude: -34.54, longitude: -58.47 },
      },
    ]);
  });

  it('lleva los títulos a la abreviatura que entiende Georef', () => {
    expect(normalizeGeorefQuery('Av. Pres. Figueroa Alcorta 7597')).toBe(
      'Av. pte Figueroa Alcorta 7597',
    );
    expect(normalizeGeorefQuery('Presidente Roque Sáenz Peña 600')).toBe(
      'pte Roque Sáenz Peña 600',
    );
    expect(normalizeGeorefQuery('General Paz 5000')).toBe('gral Paz 5000');
    expect(normalizeGeorefQuery('Teniente General Perón 1500')).toBe(
      'tte gral Perón 1500',
    );
    expect(normalizeGeorefQuery('Doctor Honorio Pueyrredón 1000')).toBe(
      'dr Honorio Pueyrredón 1000',
    );
  });

  it('no toca palabras que sólo empiezan igual', () => {
    expect(normalizeGeorefQuery('Generalísimo 100')).toBe('Generalísimo 100');
    expect(normalizeGeorefQuery('Corrientes 1234')).toBe('Corrientes 1234');
  });

  it('distingue la calle entera de una altura o una esquina', () => {
    expect(isWholeStreet('AV SANTA FE, Comuna 2, CABA')).toBe(true);
    expect(isWholeStreet('AV SANTA FE 3200, Comuna 2, CABA')).toBe(false);
    expect(isWholeStreet('AV SANTA FE (ESQUINA AV CALLAO), Comuna 2')).toBe(
      false,
    );
    // Un número en el nombre de la calle no es la altura.
    expect(isWholeStreet('AV 9 DE JULIO, Comuna 1, CABA')).toBe(true);
    expect(isWholeStreet('AV 9 DE JULIO 1000, Comuna 1, CABA')).toBe(false);
  });
});
