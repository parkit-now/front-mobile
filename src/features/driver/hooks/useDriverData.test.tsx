import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeVehicle } from '../../../test/driverData';
import { makeBooking, makeParking } from '../testFixtures';
import { FALLBACK_RESERVABLE_CATEGORIES } from '../vehicles';
import { DriverDataProvider, useDriverData } from './useDriverData';

const reservations = vi.hoisted(() => ({
  listReservations: vi.fn(),
  getReservation: vi.fn(),
  createReservation: vi.fn(),
  retryReservationPayment: vi.fn(),
  previewCancel: vi.fn(),
  cancelReservation: vi.fn(),
}));
const vehicles = vi.hoisted(() => ({
  listVehicles: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
}));
const categories = vi.hoisted(() => ({ listReservableCategories: vi.fn() }));

vi.mock('../services/reservations', () => reservations);
vi.mock('../services/vehicles', () => vehicles);
vi.mock('../services/vehicleCategories', () => categories);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <DriverDataProvider accessToken="token">{children}</DriverDataProvider>
  );
}

async function renderData() {
  const hook = renderHook(() => useDriverData(), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.bookingsStatus).not.toBe('loading');
    expect(hook.result.current.vehiclesStatus).not.toBe('loading');
  });
  return hook;
}

const booking = makeBooking();
const vehicle = makeVehicle();

describe('DriverDataProvider', () => {
  beforeEach(() => {
    // clear y no reset: reset borraría también los mocks globales de expo.
    vi.clearAllMocks();
    reservations.listReservations.mockResolvedValue([booking]);
    vehicles.listVehicles.mockResolvedValue([vehicle]);
    categories.listReservableCategories.mockResolvedValue([]);
  });

  it('carga reservas y vehículos al montarse', async () => {
    const { result } = await renderData();

    expect(result.current.bookings).toEqual([booking]);
    expect(result.current.bookingsStatus).toBe('success');
    expect(result.current.vehicles).toEqual([vehicle]);
    expect(reservations.listReservations).toHaveBeenCalledWith('token');
  });

  it('marca error si alguna lista no carga', async () => {
    reservations.listReservations.mockRejectedValue(new Error('offline'));
    vehicles.listVehicles.mockRejectedValue(new Error('offline'));

    const { result } = await renderData();

    expect(result.current.bookingsStatus).toBe('error');
    expect(result.current.vehiclesStatus).toBe('error');
  });

  it('usa las categorías del backend y, si fallan, las de respaldo', async () => {
    const remote = [{ ...FALLBACK_RESERVABLE_CATEGORIES[0], label: 'Auto' }];
    categories.listReservableCategories.mockResolvedValue(remote);
    const { result } = await renderData();
    await waitFor(() => expect(result.current.vehicleCategories).toBe(remote));

    categories.listReservableCategories.mockRejectedValue(new Error('x'));
    const fallback = await renderData();
    expect(fallback.result.current.vehicleCategories).toEqual(
      FALLBACK_RESERVABLE_CATEGORIES,
    );
  });

  it('crea la reserva con la URL de vuelta y la agrega a la lista', async () => {
    const created = makeBooking({ id: 'b-new' });
    reservations.createReservation.mockResolvedValue({
      booking: created,
      checkoutUrl: 'https://mp.test',
      holdExpiresAt: null,
    });
    const { result } = await renderData();

    await act(() =>
      result.current.createReservation({
        id: 'b-new',
        parking: makeParking(),
        vehicle,
        entryAt: '2030-01-01T10:00:00Z',
        exitAt: '2030-01-01T12:00:00Z',
      }),
    );

    expect(reservations.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'b-new',
        parkingId: 'p-1',
        vehiclePlate: 'AB123CD',
        returnUrl: expect.stringContaining('b-new') as unknown,
      }),
      'token',
    );
    expect(result.current.bookings.map((item) => item.id)).toEqual([
      'b-new',
      'b-1',
    ]);
  });

  it('relee una reserva y reemplaza la de la lista', async () => {
    const updated = { ...booking, priceLabel: '$9.000' };
    reservations.getReservation.mockResolvedValue(updated);
    const { result } = await renderData();

    await act(() => result.current.reloadBooking('b-1'));

    expect(result.current.bookings).toEqual([updated]);
  });

  it('reintenta el pago y actualiza la reserva', async () => {
    const retried = { ...booking, checkoutUrl: 'https://mp.test/2' };
    reservations.retryReservationPayment.mockResolvedValue({
      booking: retried,
      checkoutUrl: 'https://mp.test/2',
    });
    const { result } = await renderData();

    await act(() => result.current.retryPayment('b-1'));

    expect(result.current.bookings).toEqual([retried]);
  });

  it('cancela sin tocar la lista hasta que se aplica el resultado', async () => {
    const cancelled = { ...booking, lifecycle: 'cancelled' as const };
    reservations.previewCancel.mockResolvedValue({ allowed: true });
    reservations.cancelReservation.mockResolvedValue(cancelled);
    const { result } = await renderData();

    await act(() => result.current.previewCancel('b-1'));
    await act(() => result.current.cancelReservation('b-1'));
    expect(result.current.bookings).toEqual([booking]);

    act(() => {
      result.current.applyBooking(cancelled);
      result.current.applyBooking(makeBooking({ id: 'b-2' }));
    });
    expect(result.current.bookings.map((item) => item.lifecycle)).toEqual([
      'confirmed',
      'cancelled',
    ]);
    expect(reservations.previewCancel).toHaveBeenCalledWith('b-1', 'token');
  });

  it('una lectura vieja no pisa una cancelación en curso', async () => {
    let finishCancel: (value: unknown) => void = () => {};
    reservations.cancelReservation.mockReturnValue(
      new Promise((resolve) => {
        finishCancel = resolve;
      }),
    );
    const { result } = await renderData();
    reservations.listReservations.mockResolvedValue([]);

    let cancelling: Promise<unknown> = Promise.resolve();
    act(() => {
      cancelling = result.current.cancelReservation('b-1');
    });
    await act(() => result.current.refreshBookings());
    expect(result.current.bookings).toEqual([booking]);

    finishCancel(booking);
    await act(() => cancelling);
  });

  it('da de alta, edita y borra vehículos releyendo la lista', async () => {
    const draft = {
      plate: 'AC456DE',
      category: 'car' as const,
      brand: '',
      model: '',
    };
    const { result } = await renderData();

    await act(() =>
      result.current.saveVehicle({ vehicle: null, draft, makePrimary: false }),
    );
    await act(() =>
      result.current.saveVehicle({ vehicle, draft, makePrimary: true }),
    );
    await act(() => result.current.removeVehicle('v-1'));

    expect(vehicles.createVehicle).toHaveBeenCalledWith(draft, false, 'token');
    expect(vehicles.updateVehicle).toHaveBeenCalledWith(
      vehicle,
      draft,
      true,
      'token',
    );
    expect(vehicles.deleteVehicle).toHaveBeenCalledWith('v-1', 'token');
    expect(vehicles.listVehicles).toHaveBeenCalledTimes(4);
  });

  it('exige estar dentro del provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useDriverData())).toThrow(
      'useDriverData debe usarse dentro de DriverDataProvider',
    );
  });
});
