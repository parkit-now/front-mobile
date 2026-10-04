import type { SearchDestination } from '../discovery';
import type { ParkingLot } from '../mock';
import { searchGeorefAddresses } from './georef';
import { searchParkingsByName } from './driver';

export type DestinationSuggestions = {
  addresses: SearchDestination[];
  parkings: ParkingLot[];
};

/**
 * Busca estacionamientos por nombre y direcciones (Georef) en paralelo. Si una
 * de las dos falla se muestra igual lo de la otra; sólo si fallan las dos el
 * error sube para que la pantalla ofrezca reintentar.
 */
export async function searchDestinationSuggestions(
  query: string,
  bearer: string,
  coords?: { latitude: number; longitude: number },
): Promise<DestinationSuggestions> {
  const [addresses, parkings] = await Promise.allSettled([
    searchGeorefAddresses(query),
    searchParkingsByName(query.trim(), bearer, coords),
  ]);
  if (addresses.status === 'rejected' && parkings.status === 'rejected') {
    throw addresses.reason;
  }
  return {
    addresses: addresses.status === 'fulfilled' ? addresses.value : [],
    parkings: parkings.status === 'fulfilled' ? parkings.value : [],
  };
}
