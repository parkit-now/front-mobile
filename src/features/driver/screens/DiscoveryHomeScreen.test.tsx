import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { Linking } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDriverData } from '../../../test/driverData';
import { navigation, resetNavigation } from '../../../test/navigation';
import { renderWithProviders } from '../../../test/render';
import {
  DEFAULT_DISCOVERY_CENTER,
  toCurrentLocationDestination,
  type SearchDestination,
} from '../discovery';
import { makeParking } from '../testFixtures';
import { DiscoveryHomeScreen } from './DiscoveryHomeScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const location = vi.hoisted(() => ({
  getLocationIfGranted: vi.fn(),
  requestCurrentLocation: vi.fn(),
}));
const driver = vi.hoisted(() => ({ fetchNearbyParkings: vi.fn() }));
const recents = vi.hoisted(() => ({
  loadRecentDestinations: vi.fn(),
  saveRecentDestination: vi.fn(),
}));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../services/location', () => location);
vi.mock('../services/driver', () => driver);
vi.mock('../recentDestinations', () => recents);

type Props = ComponentProps<typeof DiscoveryHomeScreen>;

// react-native-web no implementa openSettings.
const openSettings = vi.fn(() => Promise.resolve());

const OBELISCO: SearchDestination = {
  id: 'obelisco',
  name: 'Obelisco',
  address: 'Av. 9 de Julio s/n',
  kind: 'place',
  coordinate: DEFAULT_DISCOVERY_CENTER,
};

const HERE = toCurrentLocationDestination({
  latitude: -34.61,
  longitude: -58.42,
});

function renderHome() {
  renderWithProviders(
    <DiscoveryHomeScreen {...({ navigation } as unknown as Props)} />,
  );
}

describe('DiscoveryHomeScreen', () => {
  beforeEach(() => {
    resetNavigation();
    openSettings.mockClear();
    Linking.openSettings = openSettings;
    state.data = makeDriverData();
    location.getLocationIfGranted.mockResolvedValue(null);
    location.requestCurrentLocation.mockReset();
    driver.fetchNearbyParkings.mockResolvedValue([]);
    recents.loadRecentDestinations.mockResolvedValue([]);
    recents.saveRecentDestination.mockImplementation(
      (destination: SearchDestination) => Promise.resolve([destination]),
    );
  });

  it('abre la búsqueda en el mapa desde el buscador', () => {
    renderHome();

    fireEvent.click(screen.getByLabelText('Buscar destino'));

    expect(navigation.navigate).toHaveBeenCalledWith('MapResults');
  });

  it('abre el mapa en la ubicación del conductor y la recuerda', async () => {
    location.requestCurrentLocation.mockResolvedValue({
      destination: HERE,
      issue: null,
    });
    renderHome();

    fireEvent.click(screen.getByLabelText('Estacionar cerca mío'));

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith('MapResults', {
        destination: HERE,
      }),
    );
    expect(recents.saveRecentDestination).toHaveBeenCalledWith(HERE);
  });

  it('explica el permiso denegado y reintenta desde el diálogo', async () => {
    location.requestCurrentLocation.mockResolvedValue({
      destination: null,
      issue: { kind: 'permission-denied', canAskAgain: true },
    });
    renderHome();

    fireEvent.click(screen.getByLabelText('Estacionar cerca mío'));
    expect(await screen.findByText('Ubicación desactivada')).toBeTruthy();
    fireEvent.click(screen.getByText('Intentar de nuevo'));

    await waitFor(() =>
      expect(location.requestCurrentLocation).toHaveBeenCalledTimes(2),
    );
  });

  it('manda a los ajustes si la ubicación está apagada', async () => {
    location.requestCurrentLocation.mockResolvedValue({
      destination: null,
      issue: { kind: 'services-disabled', canAskAgain: false },
    });
    renderHome();

    fireEvent.click(screen.getByLabelText('Estacionar cerca mío'));
    fireEvent.click(await screen.findByText('Abrir ajustes'));

    expect(openSettings).toHaveBeenCalledOnce();
  });

  it('cierra el diálogo de ubicación para buscar a mano', async () => {
    location.requestCurrentLocation.mockResolvedValue({
      destination: null,
      issue: { kind: 'unavailable', canAskAgain: true },
    });
    renderHome();

    fireEvent.click(screen.getByLabelText('Estacionar cerca mío'));
    fireEvent.click(await screen.findByText('Buscar dirección'));

    expect(screen.queryByText('No encontramos tu ubicación')).toBeNull();
  });

  it('lista los destinos recientes y los vuelve a abrir', async () => {
    recents.loadRecentDestinations.mockResolvedValue([OBELISCO]);
    renderHome();

    fireEvent.click(await screen.findByText('Obelisco'));

    expect(navigation.navigate).toHaveBeenCalledWith('MapResults', {
      destination: OBELISCO,
    });
  });

  it('sugiere cocheras Parkit alrededor del centro', async () => {
    driver.fetchNearbyParkings.mockResolvedValue([
      makeParking({ id: 'p-1', name: 'Playa Uno' }),
      makeParking({ id: 'p-2', name: 'Playa Dos' }),
      makeParking({ id: 'p-3', name: 'Playa Tres' }),
      makeParking({ id: 'p-4', name: 'Playa Cuatro' }),
    ]);
    renderHome();

    expect(await screen.findByText('COCHERAS PARKIT')).toBeTruthy();
    expect(screen.queryByText('Playa Cuatro')).toBeNull();
    expect(driver.fetchNearbyParkings).toHaveBeenCalledWith(
      DEFAULT_DISCOVERY_CENTER,
      'token',
    );

    fireEvent.click(screen.getByText('Playa Dos'));
    expect(navigation.navigate).toHaveBeenCalledWith('ParkingDetails', {
      parking: expect.objectContaining({ id: 'p-2' }) as unknown,
    });
  });

  it('sugiere cocheras cerca del conductor si ya dio permiso', async () => {
    location.getLocationIfGranted.mockResolvedValue(HERE);
    driver.fetchNearbyParkings.mockResolvedValue([makeParking()]);
    renderHome();

    expect(await screen.findByText('COCHERAS CERCA TUYO')).toBeTruthy();
    expect(driver.fetchNearbyParkings).toHaveBeenCalledWith(
      HERE.coordinate,
      'token',
    );
  });

  it('oculta las sugerencias si no cargan', async () => {
    driver.fetchNearbyParkings.mockRejectedValue(new Error('offline'));
    renderHome();

    await waitFor(() => expect(driver.fetchNearbyParkings).toHaveBeenCalled());
    expect(screen.queryByText('COCHERAS PARKIT')).toBeNull();
  });

  it('muestra un aviso desde el botón de notificaciones', async () => {
    renderHome();

    fireEvent.click(screen.getByLabelText('Notificaciones'));

    expect(
      await screen.findByText('No tenés notificaciones nuevas.'),
    ).toBeTruthy();
  });
});
