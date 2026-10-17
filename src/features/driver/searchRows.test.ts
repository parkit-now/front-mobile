import { describe, expect, it } from 'vitest';
import type { SearchDestination } from './discovery';
import { buildSearchRows, looksLikeAddress } from './searchRows';

function destination(
  id: string,
  kind: SearchDestination['kind'],
): SearchDestination {
  return {
    id,
    name: id,
    address: 'CABA',
    kind,
    coordinate: { latitude: -34.6, longitude: -58.4 },
  };
}

const place = destination('Teatro Colón', 'place');
const address = destination('Cerrito 628', 'address');
const recent = destination('Av. Corrientes 3200', 'address');

function titles(rows: ReturnType<typeof buildSearchRows>): string[] {
  return rows.flatMap((row) => (row.type === 'label' ? [row.text] : []));
}

describe('looksLikeAddress', () => {
  it('reconoce alturas y esquinas', () => {
    expect(looksLikeAddress('Corrientes 1234')).toBe(true);
    expect(looksLikeAddress('Santa Fe y Callao')).toBe(true);
  });

  it('una calle sin altura también, si empieza con "Av."', () => {
    expect(looksLikeAddress('Av Santa Fe')).toBe(true);
    expect(looksLikeAddress('avenida de mayo')).toBe(true);
    expect(looksLikeAddress('Avellaneda')).toBe(false);
  });

  it('un nombre de lugar no es una dirección', () => {
    expect(looksLikeAddress('Hospital Garrahan')).toBe(false);
    expect(looksLikeAddress('Palermo')).toBe(false);
  });
});

describe('buildSearchRows', () => {
  const base = {
    showingResults: true,
    places: [place],
    addresses: [address],
    recents: [recent],
  };

  it('con un nombre muestra primero los lugares', () => {
    expect(titles(buildSearchRows({ ...base, query: 'teatro colon' }))).toEqual(
      ['LUGARES', 'DIRECCIONES'],
    );
  });

  it('con una altura muestra primero las direcciones', () => {
    expect(titles(buildSearchRows({ ...base, query: 'cerrito 628' }))).toEqual([
      'DIRECCIONES',
      'LUGARES',
    ]);
  });

  it('omite las secciones vacías', () => {
    const rows = buildSearchRows({ ...base, query: 'colon', addresses: [] });
    expect(titles(rows)).toEqual(['LUGARES']);
    expect(rows).toHaveLength(2);
  });

  it('sin búsqueda muestra los destinos recientes', () => {
    const rows = buildSearchRows({ ...base, query: '', showingResults: false });
    expect(titles(rows)).toEqual(['DESTINOS RECIENTES']);
    expect(rows[1]).toMatchObject({ destination: recent });
  });
});
