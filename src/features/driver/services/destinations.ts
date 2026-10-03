import { searchDestinations, type SearchDestination } from '../discovery';
import { searchGeorefAddresses } from './georef';

/**
 * Sugerencias de destino: primero los lugares conocidos (Obelisco, Hospital
 * Italiano…, que Georef no tiene), después direcciones y esquinas reales de
 * CABA. Si Georef falla pero hay lugares, se muestran igual; si no hay nada
 * que mostrar, el error sube para que la pantalla ofrezca reintentar.
 */
export async function searchDestinationSuggestions(
  query: string,
): Promise<SearchDestination[]> {
  const places = searchDestinations(query);
  try {
    const addresses = await searchGeorefAddresses(query);
    return [...places, ...addresses];
  } catch (error) {
    if (places.length > 0) return places;
    throw error;
  }
}
