import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/client';
import { makeDriverData, makeVehicle } from '../../../test/driverData';
import { navigation, resetNavigation } from '../../../test/navigation';
import { renderWithProviders } from '../../../test/render';
import type { ParkingLot } from '../mock';
import { makeBooking, makeParking } from '../testFixtures';
import { ParkingDetailsScreen } from './ParkingDetailsScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const driver = vi.hoisted(() => ({
  fetchParkingDetail: vi.fn(),
  fetchParkingQuote: vi.fn(),
}));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../services/driver', () => driver);

type Props = ComponentProps<typeof ParkingDetailsScreen>;

const ALL_DAY = (
  [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const
).map((day) => ({ day, openMinute: 0, closeMinute: 1440 }));

const parking = makeParking({ schedules: ALL_DAY, openNow: true });

const QUOTE = {
  durationMinutes: 120,
  entryAt: '2030-05-10T13:00:00.000Z',
  exitAt: '2030-05-10T15:00:00.000Z',
  parkingId: 'p-1',
  rate: { fractionPriceArs: 750, hourPriceArs: 1500, dailyCapArs: 0 },
  totalArs: 3000,
};

function renderDetails(routeParking: ParkingLot = parking) {
  const props = {
    navigation,
    route: { params: { parking: routeParking } },
  } as unknown as Props;
  renderWithProviders(<ParkingDetailsScreen {...props} />);
}

describe('ParkingDetailsScreen', () => {
  beforeEach(() => {
    resetNavigation();
    driver.fetchParkingDetail.mockReset();
    driver.fetchParkingQuote.mockReset();
    driver.fetchParkingQuote.mockResolvedValue(QUOTE);
    state.data = makeDriverData({ vehicles: [makeVehicle()] });
  });

  it('muestra los datos de la ruta mientras carga el detalle', () => {
    driver.fetchParkingDetail.mockReturnValue(new Promise(() => {}));
    renderDetails();

    expect(screen.getByText('Estacionamiento Once')).toBeTruthy();
    expect(screen.getByText('Consultando horarios…')).toBeTruthy();
  });

  it('muestra los horarios cuando llega el detalle', async () => {
    driver.fetchParkingDetail.mockResolvedValue(parking);
    renderDetails();

    expect(await screen.findByText('Abierto ahora')).toBeTruthy();
    expect(screen.getByText('Reservable')).toBeTruthy();
    expect(driver.fetchParkingDetail).toHaveBeenCalledWith('p-1', 'token');
  });

  it('reintenta si falla el detalle', async () => {
    driver.fetchParkingDetail
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(parking);
    renderDetails();

    fireEvent.click(await screen.findByText('Reintentar'));

    expect(await screen.findByText('Abierto ahora')).toBeTruthy();
  });

  it('explica cuando la playa no toma reservas', async () => {
    const closed = makeParking({
      acceptsReservations: false,
      openNow: false,
    });
    driver.fetchParkingDetail.mockResolvedValue(closed);
    renderDetails(closed);

    expect(await screen.findByText('Cerrado ahora')).toBeTruthy();
    expect(screen.getByText('Sin reserva anticipada')).toBeTruthy();
    expect(screen.getByText(/no está tomando reservas/)).toBeTruthy();
  });

  it('cotiza, crea la reserva y la abre', async () => {
    driver.fetchParkingDetail.mockResolvedValue(parking);
    vi.mocked(state.data.createReservation).mockResolvedValue({
      booking: makeBooking({ id: 'b-new' }),
      checkoutUrl: 'https://mp.test',
      holdExpiresAt: null,
    });
    renderDetails();

    fireEvent.click(await screen.findByText('Reservar ahora'));
    expect(screen.getByText('Confirmar reserva')).toBeTruthy();
    fireEvent.click(await screen.findByText('Reservar y pagar $3.000'));

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith('ReservationDetail', {
        reservationId: 'b-new',
      }),
    );
    expect(state.data.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        parking: expect.objectContaining({ id: 'p-1' }) as unknown,
        vehicle: expect.objectContaining({ id: 'v-1' }) as unknown,
        entryAt: QUOTE.entryAt,
        exitAt: QUOTE.exitAt,
      }),
    );
  });

  it('deja el modal abierto y muestra un toast si falla la reserva', async () => {
    driver.fetchParkingDetail.mockResolvedValue(parking);
    vi.mocked(state.data.createReservation).mockRejectedValue(
      new ApiError(409, 'Conflict', null),
    );
    renderDetails();

    fireEvent.click(await screen.findByText('Reservar ahora'));
    fireEvent.click(await screen.findByText('Reservar y pagar $3.000'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Confirmar reserva')).toBeTruthy();
  });

  it('muestra el error de cotización dentro del modal', async () => {
    driver.fetchParkingDetail.mockResolvedValue(parking);
    driver.fetchParkingQuote.mockRejectedValue(
      new ApiError(400, 'Bad Request', null),
    );
    renderDetails();

    fireEvent.click(await screen.findByText('Reservar ahora'));

    await waitFor(() =>
      expect(screen.queryByText('Reservar y pagar $3.000')).toBeNull(),
    );
    expect(screen.getByText('Reservar y pagar')).toBeTruthy();
  });

  it('manda al perfil si no hay vehículo', async () => {
    state.data = makeDriverData({ vehicles: [] });
    driver.fetchParkingDetail.mockResolvedValue(parking);
    renderDetails();

    fireEvent.click(await screen.findByText('Reservar ahora'));
    expect(
      screen.getByText('Agregá un vehículo para poder reservar.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Agregar vehículo en Perfil'));

    expect(navigation.navigate).toHaveBeenCalledWith('Profile');
    expect(screen.queryByText('Confirmar reserva')).toBeNull();
  });

  it('cierra el modal al cancelar y vuelve al mapa', async () => {
    driver.fetchParkingDetail.mockResolvedValue(parking);
    renderDetails();

    fireEvent.click(await screen.findByText('Reservar ahora'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmar reserva')).toBeNull();

    fireEvent.click(screen.getByLabelText('Volver al mapa'));
    expect(navigation.goBack).toHaveBeenCalledOnce();
  });
});
