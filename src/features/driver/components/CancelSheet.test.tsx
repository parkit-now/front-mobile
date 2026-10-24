import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/client';
import { makeDriverData } from '../../../test/driverData';
import { renderWithProviders } from '../../../test/render';
import { makeBooking } from '../testFixtures';
import { CancelSheet } from './CancelSheet';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));

const booking = makeBooking({
  entryAt: '2030-05-10T13:00:00.000Z',
  exitAt: '2030-05-10T16:00:00.000Z',
});

function renderSheet() {
  const onClose = vi.fn();
  const onCancelled = vi.fn();
  renderWithProviders(
    <CancelSheet
      booking={booking}
      onClose={onClose}
      onCancelled={onCancelled}
    />,
  );
  return { onClose, onCancelled };
}

describe('CancelSheet', () => {
  beforeEach(() => {
    state.data = makeDriverData();
  });

  it('calcula el reembolso antes de ofrecer cancelar', () => {
    renderSheet();

    expect(screen.getByText('Calculando tu reembolso…')).toBeTruthy();
    expect(screen.queryByText('Sí, cancelar')).toBeNull();
  });

  it('muestra el reembolso y cancela al confirmar', async () => {
    const cancelled = { ...booking, lifecycle: 'cancelled' as const };
    state.data = makeDriverData({
      previewCancel: vi.fn(() =>
        Promise.resolve({
          allowed: true,
          kind: 'full' as const,
          reasonCode: 'free_window' as const,
          refundArs: 4500,
        }),
      ),
      cancelReservation: vi.fn(() => Promise.resolve(cancelled)),
    });
    const { onCancelled } = renderSheet();

    expect(await screen.findByText(/Te devolvemos/)).toBeTruthy();
    fireEvent.click(screen.getByText('Sí, cancelar'));

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(cancelled));
    expect(state.data.cancelReservation).toHaveBeenCalledWith('b-1');
  });

  it('no ofrece cancelar si ya no se puede', async () => {
    state.data = makeDriverData({
      previewCancel: vi.fn(() =>
        Promise.resolve({
          allowed: false,
          kind: 'none' as const,
          reasonCode: 'already_started' as const,
          refundArs: 0,
        }),
      ),
    });
    renderSheet();

    expect(
      await screen.findByText('La reserva ya empezó: no se puede cancelar.'),
    ).toBeTruthy();
    expect(screen.queryByText('Sí, cancelar')).toBeNull();
  });

  it('deja reintentar si falla el cálculo del reembolso', async () => {
    state.data = makeDriverData({
      previewCancel: vi
        .fn()
        .mockRejectedValueOnce(new ApiError(500, 'boom', null))
        .mockReturnValue(new Promise(() => {})),
    });
    renderSheet();

    fireEvent.click(await screen.findByText('Reintentar'));

    expect(screen.getByText('Calculando tu reembolso…')).toBeTruthy();
    expect(state.data.previewCancel).toHaveBeenCalledTimes(2);
  });

  it('muestra el error y queda abierta si falla la cancelación', async () => {
    state.data = makeDriverData({
      previewCancel: vi.fn(() =>
        Promise.resolve({
          allowed: true,
          kind: 'none' as const,
          reasonCode: 'late_window' as const,
          refundArs: 0,
        }),
      ),
      cancelReservation: vi.fn(() =>
        Promise.reject(new ApiError(409, 'Conflict', null)),
      ),
    });
    const { onCancelled } = renderSheet();

    expect(await screen.findByText('No corresponde reembolso')).toBeTruthy();
    fireEvent.click(screen.getByText('Sí, cancelar'));

    await waitFor(() => expect(screen.getByText('Sí, cancelar')).toBeTruthy());
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('se cierra con Volver', () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByText('Volver'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
