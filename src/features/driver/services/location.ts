import * as Location from 'expo-location';
import {
  toCurrentLocationDestination,
  type SearchDestination,
} from '../discovery';

export type LocationIssue = {
  kind: 'permission-denied' | 'services-disabled' | 'unavailable';
  canAskAgain: boolean;
};

export type CurrentLocationResult =
  | { destination: SearchDestination; issue: null }
  | { destination: null; issue: LocationIssue };

const LOCATION_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Ubicación del conductor SIN pedir permiso: sólo responde si ya lo otorgó
 * antes. La usa el mapa de inicio para centrarse sin mostrar un diálogo al
 * abrir la app.
 */
export async function getLocationIfGranted(): Promise<SearchDestination | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) return null;
    const position = await Location.getLastKnownPositionAsync();
    return position ? toCurrentLocationDestination(position.coords) : null;
  } catch {
    return null;
  }
}

export async function requestCurrentLocation(): Promise<CurrentLocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return {
        destination: null,
        issue: {
          kind: 'permission-denied',
          canAskAgain: permission.canAskAgain,
        },
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        destination: null,
        issue: { kind: 'services-disabled', canAskAgain: false },
      };
    }

    // Sin señal el GPS puede no responder nunca: pasado el límite se usa la
    // última posición conocida y, si tampoco hay, se informa el problema.
    const position =
      (await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        LOCATION_TIMEOUT_MS,
      )) ?? (await Location.getLastKnownPositionAsync());
    if (!position) {
      return {
        destination: null,
        issue: { kind: 'unavailable', canAskAgain: true },
      };
    }
    return {
      destination: toCurrentLocationDestination(position.coords),
      issue: null,
    };
  } catch {
    return {
      destination: null,
      issue: { kind: 'unavailable', canAskAgain: true },
    };
  }
}
