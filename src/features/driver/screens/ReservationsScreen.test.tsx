import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDriverData } from '../../../test/driverData';
import { navigation, resetNavigation } from '../../../test/navigation';
import { renderWithProviders } from '../../../test/render';
import { makeBooking } from '../testFixtures';
import { ReservationsScreen } from './ReservationsScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const directions = vi.hoisted(() => ({ openDirections: vi.fn() }));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../services/directions', () => directions);

const FUTURE = {
  entryAt: '2030-05-10T13:00:00.000Z',
  exitAt: '2030-05-10T16:00:00.000Z',
};

const confirmed = makeBooking({
  id: 'b-confirmed',
  parkingName: 'Playa Centro',
  ...FUTURE,
});
const pending = makeBooking({
  id: 'b-pending',
  parkingName: 'Playa Norte',
  lifecycle: 'pending_approval',
  paymentStatus: 'approved',
  approvalDeadlineAt: '2030-05-10T12:00:00.000Z',
  ...FUTURE,
});

describe('ReservationsScreen', () => {
  beforeEach(() => {
    resetNavigation();
    directions.openDirections.mockReset();
  });

  it('muestra un indicador durante la primera carga', () => {
    state.data = makeDriverData({ bookingsStatus: 'loading' });
    renderWithProviders(<ReservationsScreen />);

    expect(screen.getByText('Cargando tus reservas…')).toBeTruthy();
  });

  it('ofrece reintentar si no cargan las reservas', () => {
    state.data = makeDriverData({ bookingsStatus: 'error' });
    renderWithProviders(<ReservationsScreen />);
    const refreshCallsOnFocus = vi.mocked(state.data.refreshBookings).mock.calls
      .length;

    fireEvent.click(screen.getByText('Reintentar'));

    expect(state.data.refreshBookings).toHaveBeenCalledTimes(
      refreshCallsOnFocus + 1,
    );
  });

  it('relee la lista al enfocar la pestaña', () => {
    state.data = makeDriverData();
    renderWithProviders(<ReservationsScreen />);

    expect(state.data.refreshBookings).toHaveBeenCalled();
  });

  it('muestra el estado vacío de la pestaña elegida', () => {
    state.data = makeDriverData({ bookings: [] });
    renderWithProviders(<ReservationsScreen />);

    expect(screen.getByText('No tenés reservas confirmadas')).toBeTruthy();
  });

  it('abre en Pendientes si hay algo esperando', async () => {
    state.data = makeDriverData({ bookings: [confirmed, pending] });
    renderWithProviders(<ReservationsScreen />);

    expect(await screen.findByText('Playa Norte')).toBeTruthy();
    expect(screen.queryByText('Playa Centro')).toBeNull();
  });

  it('cambia de pestaña y abre una reserva', async () => {
    state.data = makeDriverData({ bookings: [confirmed, pending] });
    renderWithProviders(<ReservationsScreen />);

    fireEvent.click(screen.getByText('Confirmadas'));
    fireEvent.click(await screen.findByText('Playa Centro'));

    expect(navigation.navigate).toHaveBeenCalledWith('ReservationDetail', {
      reservationId: 'b-confirmed',
    });
  });

  it('muestra el texto vacío de cada pestaña', () => {
    state.data = makeDriverData({ bookings: [] });
    renderWithProviders(<ReservationsScreen />);

    fireEvent.click(screen.getByText('Pendientes'));
    expect(screen.getByText('No tenés reservas pendientes')).toBeTruthy();
    fireEvent.click(screen.getByText('Completadas'));
    expect(screen.getByText('Todavía no completaste reservas')).toBeTruthy();
    fireEvent.click(screen.getByText('Canceladas'));
    expect(screen.getByText('No tenés reservas canceladas')).toBeTruthy();
  });

  it('avisa si no se puede abrir la app de mapas', async () => {
    directions.openDirections.mockResolvedValue(false);
    state.data = makeDriverData({ bookings: [confirmed] });
    renderWithProviders(<ReservationsScreen />);

    fireEvent.click(await screen.findByLabelText('Cómo llegar a Playa Centro'));

    await waitFor(() =>
      expect(
        screen.getByText('No pudimos abrir la aplicación de mapas.'),
      ).toBeTruthy(),
    );
    expect(directions.openDirections).toHaveBeenCalledWith(
      confirmed.coordinate,
    );
  });
});
