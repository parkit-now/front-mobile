import type { VehicleCategory } from './vehicles';

// Un modelo del catálogo de la plataforma (GET /driver/vehicle-catalog).
export type CatalogItem = {
  brand: string;
  model: string;
  category: VehicleCategory;
};

// Lo que se puede elegir en el buscador: un modelo, o la marca sola para quien
// no encuentra su modelo. No hay texto libre (SCRUM-301).
export type CatalogOption =
  | { kind: 'model'; brand: string; model: string; category: VehicleCategory }
  | { kind: 'brand'; brand: string };

const MAX_BRAND_OPTIONS = 2;

/** Minúsculas y sin tildes: "Citroën" se encuentra escribiendo "citroen". */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function words(value: string): string[] {
  return normalizeSearch(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Cada palabra buscada tiene que ser el comienzo de alguna palabra del texto.
function matches(tokens: string[], text: string[]): boolean {
  return tokens.every((token) => text.some((word) => word.startsWith(token)));
}

/**
 * Opciones para lo que el conductor va escribiendo ("etios", "toy cor").
 * Primero las marcas que coinciden (para elegir la marca sola) y después los
 * modelos, con los que empiezan por lo escrito arriba. Sin texto no hay
 * opciones: el catálogo entero no se lista.
 */
export function searchCatalog(
  items: readonly CatalogItem[],
  query: string,
  limit = 30,
): CatalogOption[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];

  const brands = [...new Set(items.map((item) => item.brand))]
    .filter((brand) => matches(tokens, words(brand)))
    .slice(0, MAX_BRAND_OPTIONS)
    .map((brand): CatalogOption => ({ kind: 'brand', brand }));

  const first = tokens[0];
  const models = items
    .filter((item) => matches(tokens, words(`${item.brand} ${item.model}`)))
    .map((item) => ({
      item,
      // 0: el modelo empieza por lo escrito; 1: coincide por la marca u otra
      // palabra. El orden del catálogo (marca, modelo) desempata.
      rank: normalizeSearch(item.model).startsWith(first) ? 0 : 1,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, Math.max(0, limit - brands.length))
    .map(({ item }): CatalogOption => ({ kind: 'model', ...item }));

  return [...brands, ...models];
}

export function catalogOptionLabel(option: CatalogOption): string {
  return option.kind === 'model'
    ? `${option.brand} ${option.model}`
    : option.brand;
}
