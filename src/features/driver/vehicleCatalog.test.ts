import { describe, expect, it } from 'vitest';
import {
  catalogOptionLabel,
  normalizeSearch,
  searchCatalog,
  type CatalogItem,
} from './vehicleCatalog';

// Ordenado por marca y modelo, como lo devuelve el backend.
const CATALOG: CatalogItem[] = [
  { brand: 'BYD', model: 'Dolphin', category: 'car' },
  { brand: 'Citroën', model: 'C3', category: 'car' },
  { brand: 'Toyota', model: 'Corolla', category: 'car' },
  { brand: 'Toyota', model: 'Corolla Cross', category: 'suv' },
  { brand: 'Toyota', model: 'Etios', category: 'car' },
  { brand: 'Toyota', model: 'Hilux', category: 'pickup' },
  { brand: 'Volkswagen', model: 'T-Cross', category: 'suv' },
];

const labels = (query: string, limit?: number) =>
  searchCatalog(CATALOG, query, limit).map(
    (option) => `${option.kind}:${catalogOptionLabel(option)}`,
  );

describe('searchCatalog', () => {
  it('sin texto no lista nada', () => {
    expect(searchCatalog(CATALOG, '')).toEqual([]);
    expect(searchCatalog(CATALOG, '   ')).toEqual([]);
  });

  it('encuentra el modelo por el comienzo de una palabra, sin importar mayúsculas', () => {
    expect(labels('eti')).toEqual(['model:Toyota Etios']);
    expect(labels('ETIOS')).toEqual(['model:Toyota Etios']);
    expect(labels('cross')).toEqual([
      'model:Toyota Corolla Cross',
      'model:Volkswagen T-Cross',
    ]);
  });

  it('por la marca ofrece la marca sola y después sus modelos', () => {
    expect(labels('toyota')).toEqual([
      'brand:Toyota',
      'model:Toyota Corolla',
      'model:Toyota Corolla Cross',
      'model:Toyota Etios',
      'model:Toyota Hilux',
    ]);
  });

  it('combina marca y modelo en cualquier orden', () => {
    expect(labels('toy cor')).toEqual([
      'model:Toyota Corolla',
      'model:Toyota Corolla Cross',
    ]);
    expect(labels('hilux toyota')).toEqual(['model:Toyota Hilux']);
  });

  it('pone primero los modelos que empiezan por lo escrito', () => {
    // "c" coincide con Citroën (marca) y con C3, Corolla... (modelo).
    expect(labels('c').slice(0, 4)).toEqual([
      'brand:Citroën',
      'model:Citroën C3',
      'model:Toyota Corolla',
      'model:Toyota Corolla Cross',
    ]);
  });

  it('ignora tildes y diéresis', () => {
    expect(labels('citroen')).toEqual(['brand:Citroën', 'model:Citroën C3']);
    expect(normalizeSearch('  Citroën ')).toBe('citroen');
  });

  it('no inventa opciones para lo que no está en el catálogo', () => {
    expect(labels('pirulo')).toEqual([]);
    expect(labels('toyota pirulo')).toEqual([]);
  });

  it('respeta el límite contando las marcas', () => {
    expect(labels('toyota', 3)).toEqual([
      'brand:Toyota',
      'model:Toyota Corolla',
      'model:Toyota Corolla Cross',
    ]);
  });

  it('el modelo elegido trae su categoría para precargar el tipo', () => {
    expect(searchCatalog(CATALOG, 'hilux')).toEqual([
      { kind: 'model', brand: 'Toyota', model: 'Hilux', category: 'pickup' },
    ]);
  });
});
