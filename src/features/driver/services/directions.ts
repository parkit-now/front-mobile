import { Linking } from 'react-native';
import type { Coordinate } from '../geo';

export function buildDirectionsUrl({
  latitude,
  longitude,
}: Coordinate): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

// Delegamos la navegación a Google Maps (ver docs/map-discovery/mvp-decisions.md).
// Devuelve false si el sistema no pudo abrir la URL, para que la UI avise.
export async function openDirections(
  destination: Coordinate,
): Promise<boolean> {
  try {
    await Linking.openURL(buildDirectionsUrl(destination));
    return true;
  } catch {
    return false;
  }
}
