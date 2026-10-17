import { describe, expect, it } from 'vitest';
import { mapPhotonFeatures, rankByQuery, type PhotonFeature } from './photon';

const CABA = 'Ciudad Autónoma de Buenos Aires';

function feature(
  properties: PhotonFeature['properties'],
  coordinates: [number, number] = [-58.4, -34.6],
): PhotonFeature {
  return { geometry: { coordinates }, properties };
}

describe('mapPhotonFeatures', () => {
  it('arma el destino con calle, altura y barrio', () => {
    expect(
      mapPhotonFeatures([
        feature(
          {
            osm_type: 'W',
            osm_id: 1,
            osm_key: 'amenity',
            osm_value: 'theatre',
            name: 'Teatro Colón',
            street: 'Cerrito',
            housenumber: '628',
            district: 'San Nicolás',
            state: CABA,
          },
          [-58.3831, -34.6011],
        ),
      ]),
    ).toEqual([
      {
        id: 'photon:W1',
        name: 'Teatro Colón',
        address: 'Cerrito 628 · San Nicolás',
        kind: 'place',
        coordinate: { latitude: -34.6011, longitude: -58.3831 },
      },
    ]);
  });

  it('un barrio se muestra como barrio', () => {
    const [palermo] = mapPhotonFeatures([
      feature({
        osm_key: 'place',
        osm_value: 'suburb',
        name: 'Palermo',
        state: CABA,
      }),
    ]);
    expect(palermo.address).toBe('Barrio · CABA');
  });

  it('descarta lo que está fuera de CABA aunque caiga en el rectángulo', () => {
    expect(
      mapPhotonFeatures([
        feature({
          name: 'Teatro Colonial',
          city: 'Avellaneda',
          state: 'Buenos Aires',
        }),
      ]),
    ).toEqual([]);
  });

  it('sin provincia, la comuna alcanza para saber que es CABA', () => {
    expect(
      mapPhotonFeatures([
        feature({ name: 'Galería Monumental', county: 'Comuna 4' }),
      ]),
    ).toHaveLength(1);
  });

  it('descarta resultados sin nombre y repetidos en el mismo barrio', () => {
    const result = mapPhotonFeatures([
      feature({ street: 'Corrientes', housenumber: '1234', state: CABA }),
      feature({ name: 'Obelisco', district: 'San Nicolás', state: CABA }),
      feature({ name: 'obelisco', district: 'San Nicolás', state: CABA }),
      feature({ name: 'Obelisco', district: 'Palermo', state: CABA }),
    ]);
    expect(result.map((item) => item.address)).toEqual([
      'San Nicolás',
      'Palermo',
    ]);
  });

  it('devuelve como mucho cinco lugares', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      feature({ name: `Lugar ${index}`, state: CABA }),
    );
    expect(mapPhotonFeatures(many)).toHaveLength(5);
  });
});

describe('rankByQuery', () => {
  const place = (name: string) => ({
    id: name,
    name,
    address: 'CABA',
    kind: 'place' as const,
    coordinate: { latitude: -34.6, longitude: -58.4 },
  });
  const names = (query: string, list: string[]) =>
    rankByQuery(list.map(place), query).map((item) => item.name);

  it('sube el nombre con todas las palabras, sin importar tildes', () => {
    expect(names('teatro colon', ['Teatro Colonial', 'Teatro Colón'])).toEqual([
      'Teatro Colón',
      'Teatro Colonial',
    ]);
  });

  it('la última palabra cuenta mientras se escribe', () => {
    expect(names('teatro col', ['Teatro Colonial', 'Teatro Colón'])).toEqual([
      'Teatro Colonial',
      'Teatro Colón',
    ]);
    expect(names('don jul', ['Parrilla Don Benito', 'Don Julio'])).toEqual([
      'Don Julio',
      'Parrilla Don Benito',
    ]);
  });

  it('con empate respeta el orden original y no descarta nada', () => {
    expect(names('obelisco', ['Obelisco', 'Obelisco City', 'Otro'])).toEqual([
      'Obelisco',
      'Obelisco City',
      'Otro',
    ]);
  });

  it('ordena antes de recortar a cinco resultados', () => {
    const features = [
      ...Array.from({ length: 6 }, (_, index) =>
        feature({ name: `Teatro Colonial ${index}`, state: CABA }),
      ),
      feature({ name: 'Teatro Colón', state: CABA }),
    ];
    const result = mapPhotonFeatures(features, 'teatro colon');
    expect(result).toHaveLength(5);
    expect(result[0].name).toBe('Teatro Colón');
  });
});
