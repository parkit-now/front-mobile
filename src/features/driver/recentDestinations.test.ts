import { describe, expect, it } from 'vitest';
import type { SearchDestination } from './discovery';
import {
  addRecentDestination,
  MAX_RECENT_DESTINATIONS,
  parseRecentDestinations,
} from './recentDestinations';

function place(n: number, name = `Lugar ${n}`): SearchDestination {
  return {
    id: `p${n}`,
    name,
    address: `Calle ${n}`,
    kind: 'address',
    coordinate: { latitude: -34 - n / 100, longitude: -58 },
  };
}

describe('addRecentDestination', () => {
  it('pone el más nuevo primero y limita a 5', () => {
    let list: SearchDestination[] = [];
    for (let i = 0; i < 7; i++) list = addRecentDestination(list, place(i));
    expect(list).toHaveLength(MAX_RECENT_DESTINATIONS);
    expect(list[0]?.id).toBe('p6');
  });

  it('no repite por nombre y coordenadas redondeadas', () => {
    const first = place(1);
    const again = {
      ...first,
      id: 'otro',
      coordinate: {
        latitude: first.coordinate.latitude + 0.00001,
        longitude: first.coordinate.longitude,
      },
    };
    const list = addRecentDestination([place(2), first], again);
    expect(list.map((item) => item.id)).toEqual(['otro', 'p2']);
  });

  it('ignora la ubicación actual', () => {
    const current: SearchDestination = {
      ...place(1),
      kind: 'current-location',
    };
    expect(addRecentDestination([], current)).toEqual([]);
  });
});

describe('parseRecentDestinations', () => {
  it('tolera null y JSON roto', () => {
    expect(parseRecentDestinations(null)).toEqual([]);
    expect(parseRecentDestinations('{no')).toEqual([]);
    expect(parseRecentDestinations('{"a":1}')).toEqual([]);
  });

  it('descarta entradas inválidas', () => {
    const raw = JSON.stringify([place(1), { id: 3 }]);
    expect(parseRecentDestinations(raw)).toEqual([place(1)]);
  });
});
