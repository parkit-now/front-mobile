import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_CENTER,
  isSearchedDestination,
  isWithinCoverage,
  toCurrentLocationDestination,
} from './discovery';

describe('toCurrentLocationDestination', () => {
  it('construye un destino sin perder precisión de coordenadas', () => {
    expect(
      toCurrentLocationDestination({
        latitude: -34.6037345,
        longitude: -58.3815704,
      }),
    ).toEqual({
      id: 'current-location',
      name: 'Mi ubicación',
      address: 'Ubicación actual',
      kind: 'current-location',
      coordinate: {
        latitude: -34.6037345,
        longitude: -58.3815704,
      },
    });
  });
});

describe('isSearchedDestination', () => {
  const coordinate = { latitude: -34.6, longitude: -58.38 };

  it('sin destino no hay nada buscado', () => {
    expect(isSearchedDestination(undefined)).toBe(false);
    expect(isSearchedDestination(null)).toBe(false);
  });

  it('la ubicación del conductor no cuenta como destino buscado', () => {
    expect(
      isSearchedDestination(toCurrentLocationDestination(coordinate)),
    ).toBe(false);
  });

  it('una dirección o un lugar elegido sí', () => {
    expect(
      isSearchedDestination({
        id: 'a',
        name: 'Av. Corrientes 1234',
        address: 'CABA',
        kind: 'address',
        coordinate,
      }),
    ).toBe(true);
  });
});

describe('isWithinCoverage', () => {
  it('el centro por defecto del mapa está dentro de la cobertura', () => {
    expect(isWithinCoverage(DEFAULT_DISCOVERY_CENTER)).toBe(true);
  });

  it('los barrios del borde de CABA están dentro', () => {
    // Núñez (Monumental) y Villa Lugano.
    expect(isWithinCoverage({ latitude: -34.5453, longitude: -58.4498 })).toBe(
      true,
    );
    expect(isWithinCoverage({ latitude: -34.6756, longitude: -58.4759 })).toBe(
      true,
    );
  });

  it('otra ciudad queda afuera', () => {
    // La Plata y la ubicación por defecto del emulador (Mountain View).
    expect(isWithinCoverage({ latitude: -34.9214, longitude: -57.9545 })).toBe(
      false,
    );
    expect(isWithinCoverage({ latitude: 37.422, longitude: -122.084 })).toBe(
      false,
    );
  });
});
