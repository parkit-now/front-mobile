import type { ParkingLot } from './mock';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type DiscoveredParkingLot = ParkingLot & {
  distanceMeters: number;
  distanceLabel: string;
  walkingTimeLabel: string;
};

export type ParkingDiscovery = {
  nearby: DiscoveredParkingLot[];
  nearestFallback: DiscoveredParkingLot[];
};

const EARTH_RADIUS_METERS = 6_371_000;
const WALKING_METERS_PER_MINUTE = 75;

export function discoverParkingLots(
  parkingLots: ParkingLot[],
  origin: Coordinate,
  radiusMeters = 5000,
): ParkingDiscovery {
  const ranked = parkingLots
    .map((parking) => {
      const distanceMeters = Math.round(
        calculateDistanceMeters(origin, parking.coordinate),
      );
      return {
        ...parking,
        distanceMeters,
        distanceLabel: formatDistance(distanceMeters),
        walkingTimeLabel: `${Math.max(1, Math.round(distanceMeters / WALKING_METERS_PER_MINUTE))} min caminando`,
      };
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  return {
    nearby: ranked.filter((parking) => parking.distanceMeters <= radiusMeters),
    nearestFallback: ranked.slice(0, 3),
  };
}

export function calculateDistanceMeters(
  from: Coordinate,
  to: Coordinate,
): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1000).toLocaleString('es-AR', {
    maximumFractionDigits: 1,
  })} km`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
