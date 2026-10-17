export type SearchDestination = {
  id: string;
  name: string;
  address: string;
  /**
   * `street`: una calle sin altura. No es un destino todavía: elegirla completa
   * el buscador para que el conductor escriba la altura.
   */
  kind: 'address' | 'place' | 'street' | 'current-location';
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

/** Obelisco: centro del mapa de inicio cuando todavía no hay destino ni ubicación. */
export const DEFAULT_DISCOVERY_CENTER = {
  latitude: -34.6037,
  longitude: -58.3816,
};

// Rectángulo que contiene a CABA con un margen de borde (el MVP cubre sólo CABA).
const COVERAGE_BOUNDS = {
  minLatitude: -34.72,
  maxLatitude: -34.52,
  minLongitude: -58.55,
  maxLongitude: -58.32,
};

/**
 * Si el conductor está lejos de la zona de cobertura, el mapa de inicio arranca
 * en el centro de CABA: abrirlo sobre su posición mostraría un mapa sin cocheras.
 */
export function isWithinCoverage(coordinate: {
  latitude: number;
  longitude: number;
}): boolean {
  return (
    coordinate.latitude >= COVERAGE_BOUNDS.minLatitude &&
    coordinate.latitude <= COVERAGE_BOUNDS.maxLatitude &&
    coordinate.longitude >= COVERAGE_BOUNDS.minLongitude &&
    coordinate.longitude <= COVERAGE_BOUNDS.maxLongitude
  );
}

/**
 * Un destino buscado se muestra con nombre y botón para volver al inicio; la
 * ubicación del conductor no: es el estado de reposo del mapa.
 */
export function isSearchedDestination(
  destination: SearchDestination | null | undefined,
): destination is SearchDestination {
  return (
    destination !== null &&
    destination !== undefined &&
    destination.kind !== 'current-location'
  );
}
