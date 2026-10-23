import { fireEvent, screen, waitFor } from '@testing-library/react';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/client';
import { makeDriverData } from '../../../test/driverData';
import { navigation, resetNavigation } from '../../../test/navigation';
import { renderWithProviders } from '../../../test/render';
import type { Booking } from '../mock';
import { makeBooking } from '../testFixtures';
import { ReservationDetailScreen } from './ReservationDetailScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const directions = vi.hoisted(() => ({ openDirections: vi.fn() }));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../services/directions', () => directions);

type Props = ComponentProps<typeof ReservationDetailScreen>;

const FUTURE = {
  entryAt: '2030-05-10T13:00:00.000Z',
  exitAt: '2030-05-10T16:00:00.000Z',
};

function renderDetail(booking: Booking | null, returnedAt?: number) {
  state.data = makeDriverData({
    bookings: booking ? [booking] : [],
    reloadBooking: vi.fn(() =>
      booking ? Promise.resolve(booking) : new Promise<Booking>(() => {}),
    ),
  });
  const props = {
    navigation,
    route: {
      key: 'detail',
      name: 'ReservationDetail',
      params: { reservationId: booking?.id ?? 'b-1', returnedAt },
    },
  } as unknown as Props;
  return renderWithProviders(<ReservationDetailScreen {...props} />);
}

const awaitingPayment = makeBooking({
  lifecycle: 'pending_payment',
  paymentStatus: 'pending',
  holdExpiresAt: '2030-05-10T12:10:00.000Z',
  checkoutUrl: 'https://mp.test/checkout/1',
  ...FUTURE,
});

describe('ReservationDetailScreen', () => {
  beforeEach(() => {
    resetNavigation();
    directions.openDirections.mockReset();
    vi.mocked(WebBrowser.openAuthSessionAsync).mockClear();
  });

  it('muestra un indicador hasta que llega la reserva', () => {
    renderDetail(null);

    expect(screen.getByText('Cargando tu reserva…')).toBeTruthy();
  });

  it('ofrece reintentar si no carga la reserva', async () => {
    state.data = makeDriverData({
      reloadBooking: vi.fn(() =>
        Promise.reject(new ApiError(500, 'boom', null)),
      ),
    });
    renderWithProviders(
      <ReservationDetailScreen
        {...({
          navigation,
          route: { params: { reservationId: 'missing' } },
        } as unknown as Props)}
      />,
    );

    expect(
      await screen.findByText('No pudimos cargar la reserva'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() =>
      expect(state.data.reloadBooking).toHaveBeenCalledTimes(2),
    );
  });

  it('pide pagar y abre el checkout de Mercado Pago', async () => {
    renderDetail(awaitingPayment);

    expect(screen.getByText('Confirmá y pagá')).toBeTruthy();
    fireEvent.click(screen.getByText('Pagar con Mercado Pago'));

    await waitFor(() =>
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'https://mp.test/checkout/1',
        expect.stringContaining('b-1'),
      ),
    );
    expect(state.data.retryPayment).not.toHaveBeenCalled();
  });

  it('pide un checkout nuevo después de un pago rechazado', async () => {
    const rejected = { ...awaitingPayment, paymentStatus: 'rejected' as const };
    renderDetail(rejected);
    vi.mocked(state.data.retryPayment).mockResolvedValue({
      checkoutUrl: 'https://mp.test/checkout/2',
    } as never);

    expect(screen.getByText('El pago no se aprobó')).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar con Mercado Pago'));

    await waitFor(() =>
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'https://mp.test/checkout/2',
        expect.any(String),
      ),
    );
    expect(state.data.retryPayment).toHaveBeenCalledWith('b-1');
  });

  it('muestra un toast si no se puede crear el checkout', async () => {
    renderDetail({ ...awaitingPayment, checkoutUrl: null });
    vi.mocked(state.data.retryPayment).mockRejectedValue(
      new ApiError(500, 'boom', null),
    );

    fireEvent.click(screen.getByText('Pagar con Mercado Pago'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });

  it('abre la hoja de cancelación de una reserva cancelable', () => {
    renderDetail(awaitingPayment);

    fireEvent.click(screen.getByText('Cancelar reserva'));

    expect(screen.getByText('¿Cancelar la reserva?')).toBeTruthy();
    expect(state.data.previewCancel).toHaveBeenCalledWith('b-1');
  });

  it('explica la retención vencida y ofrece otra búsqueda', () => {
    renderDetail(
      makeBooking({
        status: 'cancelled',
        lifecycle: 'expired',
        paymentStatus: 'pending',
        ...FUTURE,
      }),
    );

    expect(
      screen.getByText('Se venció el tiempo para pagar. No te cobramos nada.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Buscar otro estacionamiento'));
    expect(navigation.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Explore',
    });
  });

  it('avisa cuando la playa canceló la reserva', () => {
    renderDetail(
      makeBooking({
        status: 'cancelled',
        lifecycle: 'cancelled',
        cancelledBy: 'owner',
        reason: 'Cerramos por mantenimiento',
        refundStatus: 'refunded',
        refundedAmountArs: 4500,
        ...FUTURE,
      }),
    );

    expect(
      screen.getByText('Estacionamiento Once canceló tu reserva'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Ver mis reservas'));
    expect(navigation.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Reservations',
    });
  });

  it('muestra la reserva confirmada con cómo llegar', async () => {
    directions.openDirections.mockResolvedValue(false);
    renderDetail(makeBooking(FUTURE));

    expect(screen.getByText('Tu reserva')).toBeTruthy();
    fireEvent.click(screen.getAllByText(/Cómo llegar/)[0]);

    expect(
      await screen.findByText('No pudimos abrir la aplicación de mapas.'),
    ).toBeTruthy();
  });

  it('espera la confirmación del pago al volver del checkout', () => {
    state.data = makeDriverData({
      bookings: [awaitingPayment],
      reloadBooking: vi.fn(() => new Promise<Booking>(() => {})),
    });
    renderWithProviders(
      <ReservationDetailScreen
        {...({
          navigation,
          route: { params: { reservationId: 'b-1', returnedAt: 1 } },
        } as unknown as Props)}
      />,
    );

    expect(screen.getByText('Confirmando tu pago…')).toBeTruthy();
  });

  it('vuelve atrás, o a Reservas si no hay historial', () => {
    renderDetail(makeBooking(FUTURE));
    fireEvent.click(screen.getByLabelText('Volver'));
    expect(navigation.goBack).toHaveBeenCalledOnce();

    navigation.canGoBack.mockReturnValueOnce(false);
    fireEvent.click(screen.getByLabelText('Volver'));
    expect(navigation.navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'Reservations',
    });
  });
});
