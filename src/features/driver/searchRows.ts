import type { SearchDestination } from './discovery';

export type SearchRow =
  | { type: 'label'; key: string; text: string }
  | { type: 'destination'; key: string; destination: SearchDestination };

type Input = {
  query: string;
  /** Hay una búsqueda con resultados para mostrar (no los recientes). */
  showingResults: boolean;
  places: SearchDestination[];
  addresses: SearchDestination[];
  recents: SearchDestination[];
};

/**
 * Si el texto parece una dirección ("Corrientes 1234", "Santa Fe y Callao")
 * conviene ver primero las direcciones; si no ("Garrahan", "Palermo"), los
 * lugares.
 */
export function looksLikeAddress(query: string): boolean {
  return /\d/.test(query) || /\sy\s/i.test(query);
}

/** Filas de la lista de búsqueda: secciones con su título, en orden. */
export function buildSearchRows({
  query,
  showingResults,
  places,
  addresses,
  recents,
}: Input): SearchRow[] {
  if (!showingResults) return section('DESTINOS RECIENTES', recents);
  const placeRows = section('LUGARES', places);
  const addressRows = section('DIRECCIONES', addresses);
  return looksLikeAddress(query)
    ? [...addressRows, ...placeRows]
    : [...placeRows, ...addressRows];
}

function section(title: string, items: SearchDestination[]): SearchRow[] {
  if (items.length === 0) return [];
  return [
    { type: 'label', key: `label:${title}`, text: title },
    ...items.map(
      (destination): SearchRow => ({
        type: 'destination',
        key: `${title}:${destination.id}`,
        destination,
      }),
    ),
  ];
}
