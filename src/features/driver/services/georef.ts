import type { SearchDestination } from '../discovery';
import { displayAddress } from './driver';

// API de normalización de direcciones del Estado (datos.gob.ar): gratuita y sin
// clave. La misma que usa la web para las direcciones de las playas. `02` es el
// id de la Ciudad Autónoma de Buenos Aires: el MVP cubre sólo CABA.
const GEOREF_URL = 'https://apis.datos.gob.ar/georef/api/direcciones';
const CABA_PROVINCE_ID = '02';
const MAX_RESULTS = 6;
const TIMEOUT_MS = 6000;

type GeorefAddress = {
  nomenclatura: string;
  ubicacion: { lat: number | null; lon: number | null };
  departamento?: { nombre?: string | null } | null;
};

export async function searchGeorefAddresses(
  query: string,
): Promise<SearchDestination[]> {
  const params = new URLSearchParams({
    direccion: normalizeGeorefQuery(query),
    provincia: CABA_PROVINCE_ID,
    max: '20',
    campos: 'nomenclatura,ubicacion,departamento.nombre',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetch(`${GEOREF_URL}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Georef ${response.status}`);
    const body = (await response.json()) as { direcciones?: GeorefAddress[] };
    return mapGeorefAddresses(body.direcciones ?? []);
  } finally {
    clearTimeout(timeout);
  }
}

// Georef guarda los títulos abreviados ("AV PTE FIGUEROA ALCORTA") y no
// encuentra la calle escrita completa ni con otra abreviatura ("Pres.").
const TITLE_ABBREVIATIONS: [RegExp, string][] = [
  [/\b(presidente|pres\.?)(?=\s)/gi, 'pte'],
  [/\b(general|grl\.?)(?=\s)/gi, 'gral'],
  [/\b(teniente)(?=\s)/gi, 'tte'],
  [/\b(doctor)(?=\s)/gi, 'dr'],
  [/\b(ingeniero)(?=\s)/gi, 'ing'],
];

/** "Av. Presidente Figueroa Alcorta 7597" → "Av. pte Figueroa Alcorta 7597". */
export function normalizeGeorefQuery(query: string): string {
  return TITLE_ABBREVIATIONS.reduce(
    (text, [pattern, abbreviation]) => text.replace(pattern, abbreviation),
    query.trim(),
  );
}

/**
 * Respuesta de Georef → destinos. Descarta los que no tienen coordenadas y
 * deduplica por nombre: una calle sin altura ("cabildo") vuelve como decenas de
 * tramos con la misma nomenclatura.
 */
export function mapGeorefAddresses(
  addresses: GeorefAddress[],
): SearchDestination[] {
  const seen = new Set<string>();
  const destinations: SearchDestination[] = [];
  for (const address of addresses) {
    const { lat, lon } = address.ubicacion;
    if (lat === null || lon === null) continue;
    const name = georefName(address.nomenclatura);
    if (seen.has(name)) continue;
    seen.add(name);
    destinations.push({
      id: `georef:${name}`,
      name,
      address: [address.departamento?.nombre, 'CABA']
        .filter(Boolean)
        .join(', '),
      kind: isWholeStreet(address.nomenclatura) ? 'street' : 'address',
      coordinate: { latitude: lat, longitude: lon },
    });
    if (destinations.length === MAX_RESULTS) break;
  }
  return destinations;
}

/**
 * "AV SANTA FE, Comuna 2, …" es la calle entera: Georef la devuelve con la
 * coordenada de un tramo cualquiera, que no sirve como destino. Con altura
 * ("AV SANTA FE 3200") o esquina ("… (ESQUINA AV CALLAO)") es un punto.
 */
export function isWholeStreet(nomenclatura: string): boolean {
  const [street] = nomenclatura.split(',');
  // La altura es el número del final: "9 DE JULIO" tiene un número y es una
  // calle entera.
  return !/\s\d+$/.test(street.trim()) && !/\(ESQUINA\s/i.test(street);
}

/**
 * "AV CALLAO (ESQUINA AV GRAL LAS HERAS), Comuna 2, …" →
 * "Av. Callao y Av. Gral. Las Heras".
 */
export function georefName(nomenclatura: string): string {
  const [street] = nomenclatura.split(',');
  return displayAddress(
    street.replace(/\s*\(ESQUINA\s+/i, ' Y ').replace(/\)\s*$/, ''),
  );
}
