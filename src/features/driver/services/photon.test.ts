import { describe, expect, it } from 'vitest';
import { mapPhotonFeatures, type PhotonFeature } from './photon';

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
