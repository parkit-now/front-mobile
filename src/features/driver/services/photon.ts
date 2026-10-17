import type { SearchDestination } from '../discovery';

// Photon (komoot): búsqueda de lugares por nombre sobre OpenStreetMap. Gratuita
// y sin clave; complementa a Georef, que sólo entiende calles y alturas. Es
// el servidor público, pensado para uso moderado: alcanza para el MVP.
const PHOTON_URL = 'https://photon.komoot.io/api/';
// Rectángulo de CABA (oeste, sur, este, norte); el filtro fino es `isInCaba`.
const CABA_BBOX = '-58.55,-34.72,-58.32,-34.52';
const MAX_RESULTS = 5;
// Se piden más de los que se muestran: parte se descarta por estar fuera de
// CABA o repetida.
const REQUEST_LIMIT = 12;
const TIMEOUT_MS = 6000;
const CABA = 'Ciudad Autónoma de Buenos Aires';

// Ruido que no es un destino: paradas, andenes y bicicleteros con el nombre
// del lugar ("Hospital Garrahan" es también una parada de colectivo).
const EXCLUDED_TAGS = [
  '!highway',
  '!public_transport',
  '!railway:stop',
  '!railway:platform',
  '!amenity:bicycle_rental',
];

export type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    county?: string;
    city?: string;
    state?: string;
  };
};

export async function searchPhotonPlaces(
  query: string,
): Promise<SearchDestination[]> {
  const params = new URLSearchParams({
    q: query,
    bbox: CABA_BBOX,
    limit: String(REQUEST_LIMIT),
  });
  EXCLUDED_TAGS.forEach((tag) => {
    params.append('osm_tag', tag);
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetch(`${PHOTON_URL}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Photon ${response.status}`);
    const body = (await response.json()) as { features?: PhotonFeature[] };
    return mapPhotonFeatures(body.features ?? []);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Respuesta de Photon → destinos. Sólo lugares con nombre dentro de CABA (el
 * rectángulo también toma parte del conurbano) y sin repetir nombre en el
 * mismo barrio. Las direcciones sueltas, sin nombre, las resuelve Georef.
 */
export function mapPhotonFeatures(
  features: PhotonFeature[],
): SearchDestination[] {
  const seen = new Set<string>();
  const destinations: SearchDestination[] = [];
  for (const { geometry, properties } of features) {
    const name = properties.name?.trim();
    if (!name || !isInCaba(properties)) continue;
    const barrio = isBarrio(properties) ? null : properties.district;
    const key = `${name}|${barrio ?? ''}`.toLocaleLowerCase('es-AR');
    if (seen.has(key)) continue;
    seen.add(key);
    const [longitude, latitude] = geometry.coordinates;
    destinations.push({
      id: `photon:${properties.osm_type ?? ''}${properties.osm_id ?? key}`,
      name,
      address: placeAddress(properties),
      kind: 'place',
      coordinate: { latitude, longitude },
    });
    if (destinations.length === MAX_RESULTS) break;
  }
  return destinations;
}

function isInCaba(properties: PhotonFeature['properties']): boolean {
  if (properties.state) return properties.state === CABA;
  return (
    properties.city === CABA ||
    (properties.county?.startsWith('Comuna ') ?? false)
  );
}

function isBarrio(properties: PhotonFeature['properties']): boolean {
  return (
    properties.osm_key === 'place' &&
    (properties.osm_value === 'suburb' ||
      properties.osm_value === 'neighbourhood')
  );
}

/** "Cerrito 628 · San Nicolás", o "Barrio · CABA" para un barrio. */
function placeAddress(properties: PhotonFeature['properties']): string {
  if (isBarrio(properties)) return 'Barrio · CABA';
  const street = [properties.street, properties.housenumber]
    .filter(Boolean)
    .join(' ');
  return [street, properties.district ?? 'CABA'].filter(Boolean).join(' · ');
}
