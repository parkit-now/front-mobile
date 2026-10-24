import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api/client';
import { translateValidationCode } from '../../lib/api/translate';
import { renderWithProviders } from '../../test/render';
import { LoginScreen } from './LoginScreen';

const session = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signInWithProvider: vi.fn(),
}));

vi.mock('../../lib/supabase/session', () => session);

function renderLogin() {
  const onSwitchToRegister = vi.fn();
  const onForgotPassword = vi.fn();
  renderWithProviders(
    <LoginScreen
      onSwitchToRegister={onSwitchToRegister}
      onForgotPassword={onForgotPassword}
    />,
  );
  return { onSwitchToRegister, onForgotPassword };
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('LoginScreen', () => {
  beforeEach(() => {
    session.signInWithEmail.mockReset();
    session.signInWithProvider.mockReset();
  });

  it('valida en el cliente antes de llamar al backend', () => {
    renderLogin();

    fireEvent.click(screen.getByText('Ingresar'));

    expect(screen.getByText('Ingresá tu email')).toBeTruthy();
    expect(screen.getByText('Ingresá tu contraseña')).toBeTruthy();
    expect(session.signInWithEmail).not.toHaveBeenCalled();
  });

  it('borra el error de un campo apenas se lo edita', () => {
    renderLogin();
    fireEvent.click(screen.getByText('Ingresar'));

    type('Email', 'ana@parkit.com');

    expect(screen.queryByText('Ingresá tu email')).toBeNull();
    expect(screen.getByText('Ingresá tu contraseña')).toBeTruthy();
  });

  it('inicia sesión con las credenciales escritas', async () => {
    session.signInWithEmail.mockResolvedValue(undefined);
    renderLogin();

    type('Email', 'ana@parkit.com');
    type('Contraseña', 'secreto123');
    fireEvent.click(screen.getByText('Ingresar'));

    await waitFor(() =>
      expect(session.signInWithEmail).toHaveBeenCalledWith(
        'ana@parkit.com',
        'secreto123',
      ),
    );
  });

  it('muestra debajo del campo los errores de validación del backend', async () => {
    session.signInWithEmail.mockRejectedValue(
      new ApiError(400, 'Bad Request', {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'Validation failed',
        instance: '/auth/login',
        validationsErrors: [{ field: 'email', code: 'isEmail', message: '' }],
      } as never),
    );
    renderLogin();

    type('Email', 'ana@parkit.com');
    type('Contraseña', 'secreto123');
    fireEvent.click(screen.getByText('Ingresar'));

    expect(
      await screen.findByText(translateValidationCode('email', 'isEmail')),
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('muestra un toast si el backend rechaza las credenciales', async () => {
    session.signInWithEmail.mockRejectedValue(
      new ApiError(401, 'Unauthorized', null),
    );
    renderLogin();

    type('Email', 'ana@parkit.com');
    type('Contraseña', 'secreto123');
    fireEvent.click(screen.getByText('Ingresar'));

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('arranca el flujo OAuth del proveedor elegido', async () => {
    session.signInWithProvider.mockResolvedValue(undefined);
    renderLogin();

    fireEvent.click(screen.getByText('Continuar con GitHub'));

    await waitFor(() =>
      expect(session.signInWithProvider).toHaveBeenCalledWith('github'),
    );
  });

  it('muestra un toast si falla el flujo OAuth', async () => {
    session.signInWithProvider.mockRejectedValue(new Error('boom'));
    renderLogin();

    fireEvent.click(screen.getByText('Continuar con Google'));

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('navega al registro y a recuperar la contraseña', () => {
    const { onSwitchToRegister, onForgotPassword } = renderLogin();

    fireEvent.click(screen.getByText('Crear una'));
    fireEvent.click(screen.getByText('¿Olvidaste tu contraseña?'));

    expect(onSwitchToRegister).toHaveBeenCalledOnce();
    expect(onForgotPassword).toHaveBeenCalledOnce();
  });
});
