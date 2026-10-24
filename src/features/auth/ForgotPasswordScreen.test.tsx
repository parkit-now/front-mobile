import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

const auth = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }));

vi.mock('../../lib/api/auth', () => auth);

function typeEmail(value: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value } });
}

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    auth.requestPasswordReset.mockReset();
  });

  it('rechaza un email inválido sin llamar al backend', () => {
    renderWithProviders(<ForgotPasswordScreen onBackToLogin={vi.fn()} />);

    typeEmail('no-es-un-mail');
    fireEvent.click(screen.getByText('Enviar link'));

    expect(screen.getByText('Email inválido')).toBeTruthy();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('muestra la confirmación una vez pedido el link', async () => {
    auth.requestPasswordReset.mockResolvedValue(undefined);
    const onBackToLogin = vi.fn();
    renderWithProviders(<ForgotPasswordScreen onBackToLogin={onBackToLogin} />);

    typeEmail('ana@parkit.com');
    fireEvent.click(screen.getByText('Enviar link'));

    expect(await screen.findByText('Revisá tu email')).toBeTruthy();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('ana@parkit.com');

    fireEvent.click(screen.getByText('Volver a iniciar sesión'));
    expect(onBackToLogin).toHaveBeenCalledOnce();
  });

  it('mantiene el formulario y muestra un toast si falla el pedido', async () => {
    auth.requestPasswordReset.mockRejectedValue(new Error('offline'));
    renderWithProviders(<ForgotPasswordScreen onBackToLogin={vi.fn()} />);

    typeEmail('ana@parkit.com');
    fireEvent.click(screen.getByText('Enviar link'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Enviar link')).toBeTruthy());
  });
});
