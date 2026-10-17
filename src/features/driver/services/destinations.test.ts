import { describe, expect, it, vi } from 'vitest';
import { searchDestinationSuggestions } from './destinations';
import { searchParkingsByName } from './driver';
import { searchGeorefAddresses } from './georef';
import { searchPhotonPlaces } from './photon';

vi.mock('./georef', () => ({ searchGeorefAddresses: vi.fn() }));
vi.mock('./driver', () => ({ searchParkingsByName: vi.fn() }));
vi.mock('./photon', () => ({ searchPhotonPlaces: vi.fn() }));

const address = {
  id: 'a',
  name: 'Corrientes 1000',
  address: 'CABA',
  kind: 'address' as const,
  coordinate: { latitude: 1, longitude: 2 },
};

describe('searchDestinationSuggestions', () => {
  it('muestra los estacionamientos aunque Georef falle', async () => {
    vi.mocked(searchPhotonPlaces).mockResolvedValue([]);
    vi.mocked(searchGeorefAddresses).mockRejectedValue(new Error('x'));
    vi.mocked(searchParkingsByName).mockResolvedValue([{ id: 'p' } as never]);
    const result = await searchDestinationSuggestions('gar', 't');
    expect(result.addresses).toEqual([]);
    expect(result.parkings).toHaveLength(1);
  });

  it('muestra las direcciones aunque falle la búsqueda de estacionamientos', async () => {
    vi.mocked(searchPhotonPlaces).mockResolvedValue([]);
    vi.mocked(searchGeorefAddresses).mockResolvedValue([address]);
    vi.mocked(searchParkingsByName).mockRejectedValue(new Error('x'));
    const result = await searchDestinationSuggestions('gar', 't');
    expect(result.addresses).toEqual([address]);
    expect(result.parkings).toEqual([]);
  });

  it('muestra los lugares aunque fallen Georef y los estacionamientos', async () => {
    const place = { ...address, id: 'p', kind: 'place' as const };
    vi.mocked(searchPhotonPlaces).mockResolvedValue([place]);
    vi.mocked(searchGeorefAddresses).mockRejectedValue(new Error('x'));
    vi.mocked(searchParkingsByName).mockRejectedValue(new Error('x'));
    const result = await searchDestinationSuggestions('teatro', 't');
    expect(result.places).toEqual([place]);
    expect(result.addresses).toEqual([]);
  });

  it('propaga el error si fallan las tres', async () => {
    vi.mocked(searchPhotonPlaces).mockRejectedValue(new Error('x'));
    vi.mocked(searchGeorefAddresses).mockRejectedValue(new Error('boom'));
    vi.mocked(searchParkingsByName).mockRejectedValue(new Error('x'));
    await expect(searchDestinationSuggestions('gar', 't')).rejects.toThrow(
      'boom',
    );
  });
});
