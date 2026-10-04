import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SearchDestination } from './discovery';

const STORAGE_KEY = 'parkit.recentDestinations.v1';
export const MAX_RECENT_DESTINATIONS = 5;

function dedupeKey(destination: SearchDestination): string {
  const { latitude, longitude } = destination.coordinate;
  return [
    destination.name.trim().toLocaleLowerCase('es-AR'),
    latitude.toFixed(4),
    longitude.toFixed(4),
  ].join('|');
}

/** El destino más nuevo va primero; se quitan repetidos y se limita a 5. */
export function addRecentDestination(
  current: SearchDestination[],
  destination: SearchDestination,
): SearchDestination[] {
  if (destination.kind === 'current-location') return current;
  const key = dedupeKey(destination);
  return [
    destination,
    ...current.filter((item) => dedupeKey(item) !== key),
  ].slice(0, MAX_RECENT_DESTINATIONS);
}

function isDestination(value: unknown): value is SearchDestination {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<SearchDestination>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.address === 'string' &&
    typeof item.coordinate?.latitude === 'number' &&
    typeof item.coordinate.longitude === 'number'
  );
}

export function parseRecentDestinations(
  raw: string | null,
): SearchDestination[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isDestination)
      .filter((item) => item.kind !== 'current-location')
      .slice(0, MAX_RECENT_DESTINATIONS);
  } catch {
    return [];
  }
}

export async function loadRecentDestinations(): Promise<SearchDestination[]> {
  try {
    return parseRecentDestinations(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export async function saveRecentDestination(
  destination: SearchDestination,
): Promise<SearchDestination[]> {
  const next = addRecentDestination(
    await loadRecentDestinations(),
    destination,
  );
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin persistencia el destino igual se usa; sólo no queda en recientes.
  }
  return next;
}
