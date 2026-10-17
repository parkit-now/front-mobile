import type { SearchDestination } from '../discovery';
import type { ParkingLot } from '../mock';
import { searchGeorefAddresses } from './georef';
import { searchParkingsByName } from './driver';
import { searchPhotonPlaces } from './photon';

export type DestinationSuggestions = {
  /** Lugares y barrios por nombre (Photon). */
  places: SearchDestination[];
  /** Calles, alturas y esquinas (Georef). */
  addresses: SearchDestination[];
  parkings: ParkingLot[];
};

/**
 * Busca en paralelo estacionamientos por nombre, lugares (Photon) y
 * direcciones (Georef). Lo que falle no impide mostrar lo demás; sólo si fallan
 * las tres el error sube para que la pantalla ofrezca reintentar.
 */
export async function searchDestinationSuggestions(
  query: string,
  bearer: string,
  coords?: { latitude: number; longitude: number },
): Promise<DestinationSuggestions> {
  const [places, addresses, parkings] = await Promise.allSettled([
    searchPhotonPlaces(query),
    searchGeorefAddresses(query),
    searchParkingsByName(query.trim(), bearer, coords),
  ]);
  if (
    places.status === 'rejected' &&
    addresses.status === 'rejected' &&
    parkings.status === 'rejected'
  ) {
    throw addresses.reason;
  }
  return {
    places: places.status === 'fulfilled' ? places.value : [],
    addresses: addresses.status === 'fulfilled' ? addresses.value : [],
    parkings: parkings.status === 'fulfilled' ? parkings.value : [],
  };
}
