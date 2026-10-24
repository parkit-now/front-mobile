import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../lib/api/client';
import {
  displayAddress,
  fetchNearbyParkings,
  fetchParkingDetail,
  fetchParkingQuote,
  searchParkingsByName,
} from './driver';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

// Fila mínima del backend; cada caso sobreescribe lo que mira.
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    name: 'Playa Once',
    address: 'BARTOLOME MITRE 2500, Comuna 3, CABA',
    latitude: -34.6,
    longitude: -58.4,
    availableSpots: 5,
    totalSpots: 20,
    acceptsReservations: true,
    openNow: true,
    reservationHourPriceArs: 1500,
    distanceMeters: 450,
    ...overrides,
  };
}

describe('servicios del conductor', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it('busca cercanas con centro y radio y arma la cochera', async () => {
    vi.mocked(apiRequest).mockResolvedValue([row()]);

    const [parking] = await fetchNearbyParkings(
      { latitude: -34.6, longitude: -58.4 },
      'token',
    );

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/driver/parkings?latitude=-34.6&longitude=-58.4&radiusMeters=5000',
      bearer: 'token',
    });
    expect(parking).toMatchObject({
      address: 'Bartolome Mitre 2500',
      distance: '450 m',
      eta: '6 min',
      priceLabel: '$1.500/h',
      services: ['Reserva anticipada'],
      openUntil: 'Abierto ahora',
      reservationMaxDaysAhead: 7,
      reservationVehicleCategories: [],
      reservationRules: null,
      coordinate: { latitude: -34.6, longitude: -58.4 },
    });
  });

  it('marca lo que el backend no informa', async () => {
    vi.mocked(apiRequest).mockResolvedValue([
      row({
        address: null,
        reservationHourPriceArs: null,
        acceptsReservations: false,
        openNow: null,
        distanceMeters: 2350,
      }),
    ]);

    const [parking] = await fetchNearbyParkings(
      { latitude: 0, longitude: 0 },
      'token',
    );

    expect(parking).toMatchObject({
      address: 'Dirección no informada',
      priceLabel: 'Sin tarifa',
      hourlyPriceArs: 0,
      services: [],
      openUntil: 'Horario no informado',
      distance: '2,4 km',
    });
  });

  it('busca por nombre con o sin ubicación', async () => {
    vi.mocked(apiRequest).mockResolvedValue([
      row({ distanceMeters: null, openNow: false }),
    ]);

    const [parking] = await searchParkingsByName('once', 'token');
    await searchParkingsByName('once', 'token', {
      latitude: -34.6,
      longitude: -58.4,
    });

    expect(parking.distance).toBe('');
    expect(parking.openUntil).toBe('Cerrado ahora');
    expect(vi.mocked(apiRequest).mock.calls.map(([call]) => call.path)).toEqual(
      [
        '/driver/parkings/search?q=once',
        '/driver/parkings/search?q=once&latitude=-34.6&longitude=-58.4',
      ],
    );
  });

  it('trae el detalle con horarios y reglas de reserva', async () => {
    const schedules = [{ day: 'monday', openMinute: 480, closeMinute: 1200 }];
    vi.mocked(apiRequest).mockResolvedValue(
      row({ schedules, reservationMaxDaysAhead: 14 }),
    );

    const parking = await fetchParkingDetail('p-1', 'token');

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/driver/parkings/p-1',
      bearer: 'token',
    });
    expect(parking.schedules).toEqual(schedules);
    expect(parking.reservationMaxDaysAhead).toBe(14);
  });

  it('cotiza con ingreso y egreso', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ totalArs: 3000 });

    await fetchParkingQuote(
      'p-1',
      { entryAt: '2030-01-01T10:00:00Z', exitAt: '2030-01-01T12:00:00Z' },
      'token',
    );

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/driver/parkings/p-1/quote',
      body: {
        entryAt: '2030-01-01T10:00:00Z',
        exitAt: '2030-01-01T12:00:00Z',
      },
      bearer: 'token',
    });
  });
});

describe('displayAddress', () => {
  it('deja calle y altura de la nomenclatura de Georef en tipo título', () => {
    expect(
      displayAddress(
        'BARTOLOME MITRE 2500, Comuna 3, Ciudad Autónoma de Buenos Aires',
      ),
    ).toBe('Bartolome Mitre 2500');
    expect(displayAddress('AV PUEYRREDON 1850, Comuna 2, CABA')).toBe(
      'Av. Pueyrredon 1850',
    );
    expect(displayAddress('AV DE MAYO 700')).toBe('Av. de Mayo 700');
    expect(displayAddress('AV GRAL LAS HERAS 2000')).toBe(
      'Av. Gral. Las Heras 2000',
    );
    expect(displayAddress('PASEO DE LA RECOLETA 50')).toBe(
      'Paseo de la Recoleta 50',
    );
  });

  it('no toca direcciones escritas por una persona', () => {
    expect(displayAddress('Av. Cabildo 2000, CABA')).toBe(
      'Av. Cabildo 2000, CABA',
    );
  });
});
