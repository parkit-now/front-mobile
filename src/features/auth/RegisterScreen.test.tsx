import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api/client';
import { renderWithProviders } from '../../test/render';
import { RegisterScreen } from './RegisterScreen';

const session = vi.hoisted(() => ({ registerWithEmail: vi.fn() }));

vi.mock('../../lib/supabase/session', () => session);

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** El título y el botón dicen "Crear cuenta": el botón es el último. */
function submit() {
  fireEvent.click(screen.getAllByText('Crear cuenta').at(-1)!);
}

function fillValidForm() {
  type('Nombre y apellido', 'Ana Pérez');
  type('Email', 'ana@parkit.com');
  type('Contraseña', 'secreto123');
  type('Repetir contraseña', 'secreto123');
}

describe('RegisterScreen', () => {
  beforeEach(() => {
    session.registerWithEmail.mockReset();
  });

  it('marca todos los campos inválidos a la vez', () => {
    renderWithProviders(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    type('Nombre y apellido', 'Ana');
    type('Contraseña', 'corta');
    type('Repetir contraseña', 'otra');
    submit();

    expect(screen.getByText('Ingresá tu nombre y apellido')).toBeTruthy();
    expect(screen.getByText('Ingresá tu email')).toBeTruthy();
    expect(screen.getByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(session.registerWithEmail).not.toHaveBeenCalled();
  });

  it('borra el error de coincidencia cuando las contraseñas coinciden', () => {
    renderWithProviders(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    type('Contraseña', 'secreto123');
    type('Repetir contraseña', 'secreto12');
    submit();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();

    type('Repetir contraseña', 'secreto123');

    expect(screen.queryByText('Las contraseñas no coinciden')).toBeNull();
  });

  it('registra al usuario con los datos escritos', async () => {
    session.registerWithEmail.mockResolvedValue(undefined);
    renderWithProviders(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    fillValidForm();
    submit();

    await waitFor(() =>
      expect(session.registerWithEmail).toHaveBeenCalledWith(
        'Ana Pérez',
        'ana@parkit.com',
        'secreto123',
      ),
    );
  });

  it('muestra un toast si falla el registro', async () => {
    session.registerWithEmail.mockRejectedValue(
      new ApiError(409, 'Conflict', null),
    );
    renderWithProviders(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    fillValidForm();
    submit();

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('vuelve al login', () => {
    const onSwitchToLogin = vi.fn();
    renderWithProviders(<RegisterScreen onSwitchToLogin={onSwitchToLogin} />);

    fireEvent.click(screen.getByText('Ingresar'));

    expect(onSwitchToLogin).toHaveBeenCalledOnce();
  });
});
