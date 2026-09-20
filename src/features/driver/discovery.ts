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

export const CURRENT_LOCATION_DESTINATION: SearchDestination = {
  id: 'current-location',
  name: 'Mi ubicación',
  address: 'Ubicación actual',
  kind: 'current-location',
  coordinate: {
    latitude: -34.6037,
    longitude: -58.3816,
  },
};

export const RECENT_DESTINATIONS: SearchDestination[] = [
  {
    id: 'obelisco',
    name: 'Obelisco',
    address: 'Av. 9 de Julio y Corrientes, San Nicolás',
    kind: 'place',
    coordinate: { latitude: -34.6037, longitude: -58.3816 },
  },
  {
    id: 'hospital-italiano',
    name: 'Hospital Italiano',
    address: 'Gascón 450, Almagro',
    kind: 'place',
    coordinate: { latitude: -34.6075, longitude: -58.4264 },
  },
  {
    id: 'plaza-serrano',
    name: 'Plaza Serrano',
    address: 'Jorge Luis Borges y Honduras, Palermo',
    kind: 'place',
    coordinate: { latitude: -34.5888, longitude: -58.4301 },
  },
];

export const SEARCH_DESTINATIONS: SearchDestination[] = [
  ...RECENT_DESTINATIONS,
  {
    id: 'palermo-soho',
    name: 'Palermo Soho',
    address: 'Barrio Palermo, CABA',
    kind: 'place',
    coordinate: { latitude: -34.5889, longitude: -58.4296 },
  },
  {
    id: 'mercado-palermo',
    name: 'Mercado de Palermo',
    address: 'Thames 1755, Palermo',
    kind: 'place',
    coordinate: { latitude: -34.5863, longitude: -58.4307 },
  },
  {
    id: 'alto-palermo',
    name: 'Alto Palermo',
    address: 'Av. Santa Fe 3253, Palermo, CABA',
    kind: 'place',
    coordinate: { latitude: -34.5882, longitude: -58.4108 },
  },
  {
    id: 'teatro-colon',
    name: 'Teatro Colón',
    address: 'Cerrito 628, San Nicolás',
    kind: 'place',
    coordinate: { latitude: -34.601, longitude: -58.3832 },
  },
  {
    id: 'facultad-derecho',
    name: 'Facultad de Derecho',
    address: 'Av. Pres. Figueroa Alcorta 2263, Recoleta',
    kind: 'place',
    coordinate: { latitude: -34.5834, longitude: -58.3913 },
  },
];

export function searchDestinations(query: string): SearchDestination[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 3) return [];

  return SEARCH_DESTINATIONS.filter((destination) =>
    normalize(`${destination.name} ${destination.address}`).includes(
      normalizedQuery,
    ),
  );
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-AR');
}
