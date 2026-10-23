import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDriverData } from '../../../test/driverData';
import { navigation, resetNavigation, route } from '../../../test/navigation';
import { renderWithProviders } from '../../../test/render';
import type { MapPanelProps } from '../components/MapPanel.types';
import {
  DEFAULT_DISCOVERY_CENTER,
  toCurrentLocationDestination,
  type SearchDestination,
} from '../discovery';
import { makeParking } from '../testFixtures';
import { MapResultsScreen } from './MapResultsScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const location = vi.hoisted(() => ({
  getLocationIfGranted: vi.fn(),
  requestCurrentLocation: vi.fn(),
}));
const driver = vi.hoisted(() => ({ fetchNearbyParkings: vi.fn() }));
const directions = vi.hoisted(() => ({ openDirections: vi.fn() }));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../services/location', () => location);
vi.mock('../services/driver', () => driver);
vi.mock('../services/directions', () => directions);

// El mapa real es nativo: este expone las cocheras y deja simular que el
// conductor movió el mapa.
vi.mock('../components/MapPanel', () => ({
  MapPanel: ({
    parkingLots,
    onSelect,
    onRegionChangeComplete,
  }: MapPanelProps) => (
    <View>
      {parkingLots.map((parking) => (
        <Pressable
          key={parking.id}
          accessibilityLabel={`Pin ${parking.name}`}
          onPress={() => {
            onSelect(parking);
          }}
        />
      ))}
      <Pressable
        accessibilityLabel="Mover mapa"
        onPress={() => {
          onRegionChangeComplete(
            { latitude: -34.58, longitude: -58.42 },
            'gesture',
          );
        }}
      >
        <Text>mapa</Text>
      </Pressable>
    </View>
  ),
}));

type Props = ComponentProps<typeof MapResultsScreen>;

const DESTINATION: SearchDestination = {
  id: 'corrientes',
  name: 'Av. Corrientes 1234',
  address: 'CABA',
  kind: 'address',
  coordinate: { latitude: -34.6037, longitude: -58.3816 },
};

const cheap = makeParking({
  id: 'p-1',
  name: 'Playa Barata',
  hourlyPriceArs: 1000,
  priceLabel: '$1.000/h',
  availableSpots: 0,
});
const pricey = makeParking({
  id: 'p-2',
  name: 'Playa Cara',
  hourlyPriceArs: 3000,
  priceLabel: '$3.000/h',
  availableSpots: 10,
});

function renderMap(destination?: SearchDestination) {
  route.params = destination ? { destination } : undefined;
  renderWithProviders(
    <MapResultsScreen {...({ navigation, route } as unknown as Props)} />,
  );
}

describe('MapResultsScreen', () => {
  beforeEach(() => {
    resetNavigation();
    state.data = makeDriverData();
    location.getLocationIfGranted.mockResolvedValue(null);
    location.requestCurrentLocation.mockReset();
    driver.fetchNearbyParkings.mockResolvedValue([cheap, pricey]);
    directions.openDirections.mockReset();
  });

  it('busca alrededor del destino y muestra la cochera más cercana', async () => {
    renderMap(DESTINATION);

    expect(await screen.findByText('2 cocheras Parkit cerca')).toBeTruthy();
    expect(screen.getAllByText('Playa Barata').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Cocheras Parkit cerca de tu destino'),
    ).toBeTruthy();
    expect(driver.fetchNearbyParkings).toHaveBeenCalledWith(
      DESTINATION.coordinate,
      'token',
    );
  });

  it('arranca en el centro si no hay destino', async () => {
    renderMap();

    expect(await screen.findByText('¿A dónde vas?')).toBeTruthy();
    expect(driver.fetchNearbyParkings).toHaveBeenCalledWith(
      DEFAULT_DISCOVERY_CENTER,
      'token',
    );
  });

  it('elige otra cochera de la lista y abre su detalle', async () => {
    renderMap(DESTINATION);

    fireEvent.click(await screen.findByLabelText(/^Seleccionar Playa Cara/));
    fireEvent.click(screen.getByText('Ver estacionamiento'));

    expect(navigation.navigate).toHaveBeenCalledWith('ParkingDetails', {
      parking: pricey,
    });
  });

  it('elige una cochera desde su pin', async () => {
    renderMap(DESTINATION);

    fireEvent.click(await screen.findByLabelText('Pin Playa Cara'));

    expect(screen.getByLabelText(/^Seleccionar Playa Barata/)).toBeTruthy();
  });

  it('filtra las cocheras con lugares libres', async () => {
    renderMap(DESTINATION);
    await screen.findByText('2 cocheras Parkit cerca');

    fireEvent.click(screen.getByText('Disponible ahora'));

    expect(screen.getByText('1 cochera Parkit cerca')).toBeTruthy();
    expect(screen.queryByText('Playa Barata')).toBeNull();
  });

  it('sugiere quitar los filtros si ninguna coincide', async () => {
    driver.fetchNearbyParkings.mockResolvedValue([cheap]);
    renderMap(DESTINATION);
    await screen.findByText('1 cochera Parkit cerca');

    fireEvent.click(screen.getByText('Disponible ahora'));
    expect(screen.getByText('No hay cocheras con estos filtros')).toBeTruthy();
    fireEvent.click(screen.getByText('Quitar filtros'));

    expect(screen.getByText('1 cochera Parkit cerca')).toBeTruthy();
  });

  it('aplica el filtro de precio desde la hoja', async () => {
    renderMap(DESTINATION);
    await screen.findByText('2 cocheras Parkit cerca');

    fireEvent.click(screen.getByLabelText('Filtrar por precio'));
    expect(screen.getByText('Precio máximo por hora')).toBeTruthy();
    fireEvent.click(screen.getByText('Ver 2 cocheras'));

    expect(screen.queryByText('Precio máximo por hora')).toBeNull();
    expect(screen.getByText('2 cocheras Parkit cerca')).toBeTruthy();
  });

  it('avisa cuando Parkit no opera en la zona', async () => {
    driver.fetchNearbyParkings.mockResolvedValue([]);
    renderMap(DESTINATION);

    expect(
      await screen.findByText('Todavía no operamos en esta zona'),
    ).toBeTruthy();
  });

  it('reintenta si no cargan las cocheras', async () => {
    driver.fetchNearbyParkings
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([cheap]);
    renderMap(DESTINATION);

    expect(
      await screen.findByText('No pudimos cargar las cocheras'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar'));

    expect(await screen.findByText('1 cochera Parkit cerca')).toBeTruthy();
  });

  it('ofrece buscar de nuevo al mover el mapa lejos', async () => {
    renderMap(DESTINATION);
    await screen.findByText('2 cocheras Parkit cerca');

    fireEvent.click(screen.getByLabelText('Mover mapa'));
    fireEvent.click(screen.getByText('Buscar en esta zona'));

    await waitFor(() =>
      expect(driver.fetchNearbyParkings).toHaveBeenLastCalledWith(
        { latitude: -34.58, longitude: -58.42 },
        'token',
      ),
    );
    expect(
      await screen.findByText('Resultados actualizados en esta zona.'),
    ).toBeTruthy();
  });

  it('recentra en la ubicación del conductor', async () => {
    const here = toCurrentLocationDestination({
      latitude: -34.61,
      longitude: -58.42,
    });
    location.requestCurrentLocation.mockResolvedValue({
      destination: here,
      issue: null,
    });
    renderMap(DESTINATION);
    await screen.findByText('2 cocheras Parkit cerca');

    fireEvent.click(screen.getByLabelText('Centrar en mi ubicación'));

    await waitFor(() =>
      expect(navigation.setParams).toHaveBeenCalledWith({
        destination: undefined,
      }),
    );
  });

  it('avisa si no se puede abrir la app de mapas', async () => {
    directions.openDirections.mockResolvedValue(false);
    renderMap(DESTINATION);

    fireEvent.click(
      await screen.findByLabelText('Cómo llegar con Google Maps'),
    );

    expect(
      await screen.findByText('No pudimos abrir la aplicación de mapas.'),
    ).toBeTruthy();
  });

  it('abre el buscador y vuelve', async () => {
    renderMap(DESTINATION);

    fireEvent.click(
      await screen.findByLabelText(
        'Cambiar destino, actual Av. Corrientes 1234',
      ),
    );
    fireEvent.click(screen.getByLabelText('Volver'));

    expect(navigation.navigate).toHaveBeenCalledWith('DestinationSearch');
    expect(navigation.goBack).toHaveBeenCalledOnce();
  });
});
