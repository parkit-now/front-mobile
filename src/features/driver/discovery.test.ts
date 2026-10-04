import { describe, expect, it } from 'vitest';
import { toCurrentLocationDestination } from './discovery';

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
