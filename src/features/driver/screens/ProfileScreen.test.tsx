import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/client';
import { makeDriverData, makeVehicle } from '../../../test/driverData';
import { renderWithProviders } from '../../../test/render';
import { makeBooking } from '../testFixtures';
import { ProfileScreen } from './ProfileScreen';

const state = vi.hoisted(() => ({
  data: null as unknown as ReturnType<typeof makeDriverData>,
}));
const session = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock('../hooks/useDriverData', () => ({ useDriverData: () => state.data }));
vi.mock('../../../lib/supabase/session', () => session);
vi.mock('../services/vehicleCatalog', () => ({
  listVehicleCatalog: vi.fn(() => Promise.resolve([])),
}));

const SESSION = {
  access_token: 'token',
  user: { id: 'user-1', email: 'ana@parkit.com' },
} as Session;

function renderProfile() {
  renderWithProviders(<ProfileScreen session={SESSION} />);
}

function typePlate(value: string) {
  fireEvent.change(screen.getByLabelText('Patente'), { target: { value } });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    session.signOut.mockReset();
  });

  it('muestra el email de la cuenta', () => {
    state.data = makeDriverData();
    renderProfile();

    expect(screen.getByText('ana@parkit.com')).toBeTruthy();
  });

  it('muestra carga y error de la lista de vehículos', () => {
    state.data = makeDriverData({ vehiclesStatus: 'loading' });
    const { unmount } = renderWithProviders(
      <ProfileScreen session={SESSION} />,
    );
    expect(screen.getByText('Cargando tus vehículos...')).toBeTruthy();
    unmount();

    state.data = makeDriverData({ vehiclesStatus: 'error' });
    renderProfile();
    fireEvent.click(screen.getByText('No pudimos cargar tus vehículos'));
    expect(state.data.refreshVehicles).toHaveBeenCalledOnce();
  });

  it('pide un primer vehículo si no hay ninguno', () => {
    state.data = makeDriverData();
    renderProfile();

    expect(screen.getByText('Todavía no agregaste vehículos')).toBeTruthy();
  });

  it('lista los vehículos y marca el principal', () => {
    state.data = makeDriverData({
      vehicles: [
        makeVehicle(),
        makeVehicle({ id: 'v-2', plate: 'AA111BB', isPrimary: false }),
      ],
    });
    renderProfile();

    expect(screen.getByText('AB 123 CD')).toBeTruthy();
    expect(screen.getByText('AA 111 BB')).toBeTruthy();
    expect(screen.getAllByText('Principal')).toHaveLength(1);
  });

  it('agrega un vehículo y confirma con un toast', async () => {
    state.data = makeDriverData();
    renderProfile();

    fireEvent.click(screen.getByLabelText('Agregar vehículo'));
    expect(screen.getByText('Agregar vehículo')).toBeTruthy();
    typePlate('ab123cd');
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() =>
      expect(state.data.saveVehicle).toHaveBeenCalledWith({
        vehicle: null,
        draft: { plate: 'AB123CD', category: 'car', brand: '', model: '' },
        makePrimary: true,
      }),
    );
    expect(await screen.findByText('Vehículo agregado.')).toBeTruthy();
  });

  it('rechaza una patente inválida sin guardar', () => {
    state.data = makeDriverData();
    renderProfile();

    fireEvent.click(screen.getByLabelText('Agregar vehículo'));
    typePlate('X1');
    fireEvent.click(screen.getByText('Guardar'));

    expect(state.data.saveVehicle).not.toHaveBeenCalled();
    expect(screen.getByText('Agregar vehículo')).toBeTruthy();
  });

  it('deja el formulario abierto y muestra el error si falla el guardado', async () => {
    state.data = makeDriverData({
      saveVehicle: vi.fn(() =>
        Promise.reject(new ApiError(409, 'Conflict', null)),
      ),
    });
    renderProfile();

    fireEvent.click(screen.getByLabelText('Agregar vehículo'));
    typePlate('AB123CD');
    fireEvent.click(screen.getByText('Guardar'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Agregar vehículo')).toBeTruthy();
  });

  it('edita un vehículo existente', async () => {
    const vehicle = makeVehicle();
    state.data = makeDriverData({ vehicles: [vehicle] });
    renderProfile();

    fireEvent.click(screen.getByText('AB 123 CD'));
    expect(screen.getByText('Editar vehículo')).toBeTruthy();
    typePlate('AC456DE');
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() =>
      expect(state.data.saveVehicle).toHaveBeenCalledWith(
        expect.objectContaining({ vehicle }),
      ),
    );
    expect(await screen.findByText('Vehículo actualizado.')).toBeTruthy();
  });

  it('borra un vehículo después de confirmar', async () => {
    const alert = vi
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find((button) => button.text === 'Eliminar')?.onPress?.();
      });
    state.data = makeDriverData({ vehicles: [makeVehicle()] });
    renderProfile();

    fireEvent.click(screen.getByText('AB 123 CD'));
    fireEvent.click(screen.getByText('Eliminar vehículo'));

    await waitFor(() =>
      expect(state.data.removeVehicle).toHaveBeenCalledWith('v-1'),
    );
    expect(await screen.findByText('Vehículo eliminado.')).toBeTruthy();
    alert.mockRestore();
  });

  it('bloquea patente, tipo y baja con una reserva activa', () => {
    const vehicle = makeVehicle();
    state.data = makeDriverData({
      vehicles: [vehicle],
      bookings: [
        makeBooking({
          vehiclePlate: vehicle.plate,
          entryAt: '2030-05-10T13:00:00.000Z',
          exitAt: '2030-05-10T16:00:00.000Z',
        }),
      ],
    });
    renderProfile();

    fireEvent.click(screen.getByText('AB 123 CD'));

    expect(screen.getByText(/tiene una reserva activa/)).toBeTruthy();
    expect(screen.queryByText('Eliminar vehículo')).toBeNull();
  });

  it('cierra el formulario al cancelar', () => {
    state.data = makeDriverData();
    renderProfile();

    fireEvent.click(screen.getByLabelText('Agregar vehículo'));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(screen.queryByText('Agregar vehículo')).toBeNull();
  });

  it('cierra la sesión', async () => {
    session.signOut.mockResolvedValue(undefined);
    state.data = makeDriverData();
    renderProfile();

    fireEvent.click(screen.getByText('Cerrar sesión'));

    await waitFor(() => expect(session.signOut).toHaveBeenCalledOnce());
  });

  it('muestra un toast si falla el cierre de sesión', async () => {
    session.signOut.mockRejectedValue(new Error('offline'));
    state.data = makeDriverData();
    renderProfile();

    fireEvent.click(screen.getByText('Cerrar sesión'));

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
