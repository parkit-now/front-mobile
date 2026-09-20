import { describe, expect, it } from 'vitest';
import { searchDestinations } from './discovery';

describe('searchDestinations', () => {
  it('espera al menos tres caracteres', () => {
    expect(searchDestinations('av')).toEqual([]);
  });

  it('busca por nombre o dirección sin depender de tildes', () => {
    expect(searchDestinations('colon').map((item) => item.id)).toEqual([
      'teatro-colon',
    ]);
    expect(searchDestinations('gascon').map((item) => item.id)).toEqual([
      'hospital-italiano',
    ]);
  });

  it('limita los resultados al catálogo de destinos de CABA', () => {
    expect(searchDestinations('Córdoba Capital')).toEqual([]);
  });
});
