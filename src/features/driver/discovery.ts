export type SearchDestination = {
  id: string;
  name: string;
  address: string;
  kind: 'address' | 'place' | 'current-location';
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export function toCurrentLocationDestination(coordinate: {
  latitude: number;
  longitude: number;
}): SearchDestination {
  return {
    id: 'current-location',
    name: 'Mi ubicación',
    address: 'Ubicación actual',
    kind: 'current-location',
    coordinate: {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    },
  };
}
