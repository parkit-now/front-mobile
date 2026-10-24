import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDriverData } from '../../../test/driverData';
import { navigation, resetNavigation } from '../../../test/navigation';
import { renderWithProviders } from '../../../test/render';
import {
  toCurrentLocationDestination,
  type SearchDestination,
} from '../discovery';
import { makeParking } from '../testFixtures';
import { DestinationSearchScreen } from './DestinationSearchScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const location = vi.hoisted(() => ({ requestCurrentLocation: vi.fn() }));
const destinations = vi.hoisted(() => ({
  searchDestinationSuggestions: vi.fn(),
}));
const recents = vi.hoisted(() => ({
  loadRecentDestinations: vi.fn(),
  saveRecentDestination: vi.fn(),
}));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../services/location', () => location);
vi.mock('../services/destinations', () => destinations);
vi.mock('../recentDestinations', () => recents);

type Props = ComponentProps<typeof DestinationSearchScreen>;

function destination(
  overrides: Partial<SearchDestination> = {},
): SearchDestination {
  return {
    id: 'corrientes-1234',
    name: 'Av. Corrientes 1234',
    address: 'San Nicolás, CABA',
    kind: 'address',
    coordinate: { latitude: -34.6, longitude: -58.38 },
    ...overrides,
  };
}

function renderSearch() {
  renderWithProviders(
    <DestinationSearchScreen {...({ navigation } as unknown as Props)} />,
  );
}

function typeQuery(value: string) {
  fireEvent.change(screen.getByLabelText('Destino'), { target: { value } });
}

describe('DestinationSearchScreen', () => {
  beforeEach(() => {
    resetNavigation();
    state.data = makeDriverData();
    location.requestCurrentLocation.mockReset();
    destinations.searchDestinationSuggestions.mockReset();
    recents.loadRecentDestinations.mockResolvedValue([]);
    recents.saveRecentDestination.mockImplementation((item) =>
      Promise.resolve([item]),
    );
  });

  it('muestra los destinos recientes antes de escribir', async () => {
    recents.loadRecentDestinations.mockResolvedValue([
      destination({ id: 'recent', name: 'Obelisco' }),
    ]);
    renderSearch();

    fireEvent.click(await screen.findByText('Obelisco'));

    expect(navigation.popTo).toHaveBeenCalledWith('MapResults', {
      destination: expect.objectContaining({ id: 'recent' }) as unknown,
    });
  });

  it('busca desde tres caracteres y abre la dirección elegida', async () => {
    const address = destination();
    destinations.searchDestinationSuggestions.mockResolvedValue({
      places: [],
      addresses: [address],
      parkings: [],
    });
    renderSearch();

    typeQuery('Corr');
    expect(screen.getByText('Buscando…')).toBeTruthy();
    fireEvent.click(await screen.findByText('Av. Corrientes 1234'));

    expect(destinations.searchDestinationSuggestions).toHaveBeenCalledWith(
      'Corr',
      'token',
      undefined,
    );
    expect(recents.saveRecentDestination).toHaveBeenCalledWith(address);
    expect(navigation.popTo).toHaveBeenCalledWith('MapResults', {
      destination: address,
    });
  });

  it('abre directo una cochera que coincide', async () => {
    const parking = makeParking({ name: 'Playa Corrientes' });
    destinations.searchDestinationSuggestions.mockResolvedValue({
      places: [],
      addresses: [],
      parkings: [parking],
    });
    renderSearch();

    typeQuery('Playa');
    fireEvent.click(await screen.findByText('Playa Corrientes'));

    expect(navigation.navigate).toHaveBeenCalledWith('ParkingDetails', {
      parking,
    });
  });

  it('completa la calle para que se agregue la altura', async () => {
    destinations.searchDestinationSuggestions.mockResolvedValue({
      places: [],
      addresses: [destination({ kind: 'street', name: 'Av. Corrientes' })],
      parkings: [],
    });
    renderSearch();

    typeQuery('Corrientes');
    fireEvent.click(await screen.findByText('Av. Corrientes'));

    expect(screen.getByLabelText<HTMLInputElement>('Destino').value).toBe(
      'Av. Corrientes ',
    );
    expect(navigation.popTo).not.toHaveBeenCalled();
  });

  it('ofrece buscar en el mapa si nada coincide', async () => {
    destinations.searchDestinationSuggestions.mockResolvedValue({
      places: [],
      addresses: [],
      parkings: [],
    });
    renderSearch();

    typeQuery('zzzz');
    expect(await screen.findByText('Sin resultados para “zzzz”')).toBeTruthy();
    fireEvent.click(screen.getByText('Buscar en el mapa'));

    expect(navigation.popTo).toHaveBeenCalledWith('MapResults', {
      destination: undefined,
    });
  });

  it('conserva la búsqueda y reintenta tras un error de red', async () => {
    destinations.searchDestinationSuggestions
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ places: [], addresses: [], parkings: [] });
    renderSearch();

    typeQuery('Corrientes');
    expect(
      await screen.findByText('No pudimos buscar direcciones'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar'));

    await waitFor(() =>
      expect(destinations.searchDestinationSuggestions).toHaveBeenCalledTimes(
        2,
      ),
    );
  });

  it('limpia la búsqueda', () => {
    renderSearch();

    typeQuery('Co');
    fireEvent.click(screen.getByLabelText('Limpiar búsqueda'));

    expect(screen.getByLabelText<HTMLInputElement>('Destino').value).toBe('');
  });

  it('usa la ubicación actual como destino', async () => {
    const here = toCurrentLocationDestination({
      latitude: -34.61,
      longitude: -58.42,
    });
    location.requestCurrentLocation.mockResolvedValue({
      destination: here,
      issue: null,
    });
    renderSearch();

    fireEvent.click(screen.getByText('Usar mi ubicación actual'));

    await waitFor(() =>
      expect(navigation.popTo).toHaveBeenCalledWith('MapResults', {
        destination: here,
      }),
    );
  });

  it('vuelve atrás', () => {
    renderSearch();

    fireEvent.click(screen.getByLabelText('Volver'));

    expect(navigation.goBack).toHaveBeenCalledOnce();
  });
});
