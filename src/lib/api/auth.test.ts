import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loginWithPassword,
  logoutBackend,
  refreshSessionTokens,
  registerWithPassword,
  requestPasswordReset,
} from './auth';
import { apiRequest } from './client';

vi.mock('./client', () => ({ apiRequest: vi.fn(() => Promise.resolve()) }));

describe('api/auth', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockClear();
  });

  it('login manda las credenciales a /auth/login', async () => {
    await loginWithPassword({ email: 'ana@parkit.com', password: 'x' });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'ana@parkit.com', password: 'x' },
    });
  });

  it('registro manda nombre, email y contraseña', async () => {
    await registerWithPassword({
      name: 'Ana Pérez',
      email: 'ana@parkit.com',
      password: 'secreto123',
    });

    expect(apiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/register',
        body: expect.objectContaining({ name: 'Ana Pérez' }) as unknown,
      }),
    );
  });

  it('refresh manda el refresh token', async () => {
    await refreshSessionTokens({ refreshToken: 'r' });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/refresh',
      body: { refreshToken: 'r' },
    });
  });

  it('logout revoca con el bearer actual', async () => {
    await logoutBackend('token');

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/logout',
      bearer: 'token',
    });
  });

  it('recuperar contraseña manda sólo el email', async () => {
    await requestPasswordReset('ana@parkit.com');

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/auth/forgot-password',
      body: { email: 'ana@parkit.com' },
    });
  });
});
