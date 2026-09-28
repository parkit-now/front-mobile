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

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
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
