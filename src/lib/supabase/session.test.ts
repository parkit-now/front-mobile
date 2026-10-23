import * as WebBrowser from 'expo-web-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOAuthRedirectUrl,
  getSession,
  hydrateSessionFromUrl,
  onSessionChange,
  refreshCurrentSession,
  registerWithEmail,
  signInWithEmail,
  signInWithProvider,
  signOut,
  signOutLocally,
} from './session';

const auth = vi.hoisted(() => ({
  setSession: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
}));
const api = vi.hoisted(() => ({
  loginWithPassword: vi.fn(),
  registerWithPassword: vi.fn(),
  refreshSessionTokens: vi.fn(),
  logoutBackend: vi.fn(),
}));

vi.mock('./client', () => ({ supabase: { auth } }));
vi.mock('../api/auth', () => api);

const SESSION = { access_token: 'access', refresh_token: 'refresh' };
const TOKENS = { accessToken: 'access', refreshToken: 'refresh' };

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.setSession.mockResolvedValue({
      data: { session: SESSION },
      error: null,
    });
    auth.getSession.mockResolvedValue({ data: { session: SESSION } });
    auth.signOut.mockResolvedValue({ error: null });
  });

  describe('getOAuthRedirectUrl', () => {
    it('usa el deep link de la app por defecto', () => {
      expect(getOAuthRedirectUrl()).toBe('parkit://auth/callback');
    });

    it('respeta la URL configurada por entorno', () => {
      vi.stubEnv(
        'EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL',
        'https://parkit.test/cb',
      );

      expect(getOAuthRedirectUrl()).toBe('https://parkit.test/cb');
      vi.unstubAllEnvs();
    });
  });

  describe('hydrateSessionFromUrl', () => {
    it('no hace nada sin URL ni tokens', async () => {
      await hydrateSessionFromUrl(null);
      await hydrateSessionFromUrl('parkit://auth/callback');
      await hydrateSessionFromUrl('parkit://auth/callback?code=1');

      expect(auth.setSession).not.toHaveBeenCalled();
    });

    it('toma los tokens del fragmento de la URL', async () => {
      await hydrateSessionFromUrl(
        'parkit://auth/callback#access_token=a%2Bb&refresh_token=r&&=x',
      );

      expect(auth.setSession).toHaveBeenCalledWith({
        access_token: 'a+b',
        refresh_token: 'r',
      });
    });

    it('toma los tokens de la query si no hay fragmento', async () => {
      await hydrateSessionFromUrl(
        'parkit://auth/callback?access_token=a&refresh_token=r',
      );

      expect(auth.setSession).toHaveBeenCalledWith({
        access_token: 'a',
        refresh_token: 'r',
      });
    });

    it('propaga el error que vuelve del proveedor', async () => {
      await expect(
        hydrateSessionFromUrl(
          'parkit://auth/callback#error_description=Acceso+denegado',
        ),
      ).rejects.toThrow('Acceso denegado');
    });

    it('propaga el error de Supabase al guardar la sesión', async () => {
      auth.setSession.mockResolvedValue({ error: new Error('jwt inválido') });

      await expect(
        hydrateSessionFromUrl('parkit://cb#access_token=a&refresh_token=r'),
      ).rejects.toThrow('jwt inválido');
    });
  });

  it('getSession devuelve la sesión actual', async () => {
    await expect(getSession()).resolves.toBe(SESSION);
  });

  it('onSessionChange avisa los cambios y se desuscribe', () => {
    const unsubscribe = vi.fn();
    auth.onAuthStateChange.mockImplementation(
      (handler: (event: string, session: unknown) => void) => {
        handler('SIGNED_IN', SESSION);
        return { data: { subscription: { unsubscribe } } };
      },
    );
    const callback = vi.fn();

    const stop = onSessionChange(callback);
    stop();

    expect(callback).toHaveBeenCalledWith(SESSION);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  describe('signInWithProvider', () => {
    beforeEach(() => {
      auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://supabase.test/authorize' },
        error: null,
      });
    });

    it('abre el navegador y guarda la sesión al volver', async () => {
      vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
        type: 'success',
        url: 'parkit://auth/callback#access_token=a&refresh_token=r',
      });

      await signInWithProvider('google');

      expect(auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'parkit://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      expect(auth.setSession).toHaveBeenCalled();
    });

    it('no falla si la persona cierra el navegador', async () => {
      vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
        type: 'cancel',
      } as never);

      await expect(signInWithProvider('github')).resolves.toBeUndefined();
      expect(auth.setSession).not.toHaveBeenCalled();
    });

    it('falla ante un resultado inesperado del navegador', async () => {
      vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({
        type: 'locked',
      } as never);

      await expect(signInWithProvider('github')).rejects.toThrow(
        'No se pudo completar el flujo OAuth en mobile.',
      );
    });

    it('falla si Supabase no devuelve la URL', async () => {
      auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

      await expect(signInWithProvider('google')).rejects.toThrow(
        'Supabase no devolvió URL de OAuth.',
      );
    });

    it('propaga el error de Supabase', async () => {
      auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: new Error('proveedor deshabilitado'),
      });

      await expect(signInWithProvider('google')).rejects.toThrow(
        'proveedor deshabilitado',
      );
    });
  });

  it('signInWithEmail usa los tokens del backend', async () => {
    api.loginWithPassword.mockResolvedValue(TOKENS);

    await expect(signInWithEmail('ana@parkit.com', 'secreto')).resolves.toBe(
      SESSION,
    );
    expect(api.loginWithPassword).toHaveBeenCalledWith({
      email: 'ana@parkit.com',
      password: 'secreto',
    });
  });

  it('signInWithEmail falla si no se pudo armar la sesión local', async () => {
    api.loginWithPassword.mockResolvedValue(TOKENS);
    auth.setSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(signInWithEmail('ana@parkit.com', 'secreto')).rejects.toThrow(
      'No se pudo establecer la sesión local.',
    );
  });

  it('registerWithEmail recorta el nombre y abre la sesión', async () => {
    api.registerWithPassword.mockResolvedValue({ session: TOKENS });

    await registerWithEmail('  Ana Pérez ', 'ana@parkit.com', 'secreto123');

    expect(api.registerWithPassword).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: 'ana@parkit.com',
      password: 'secreto123',
    });
    expect(auth.setSession).toHaveBeenCalled();
  });

  describe('refreshCurrentSession', () => {
    it('renueva con el refresh token actual', async () => {
      api.refreshSessionTokens.mockResolvedValue(TOKENS);

      await expect(refreshCurrentSession()).resolves.toBe(SESSION);
      expect(api.refreshSessionTokens).toHaveBeenCalledWith({
        refreshToken: 'refresh',
      });
    });

    it('devuelve null sin sesión', async () => {
      auth.getSession.mockResolvedValue({ data: { session: null } });

      await expect(refreshCurrentSession()).resolves.toBeNull();
      expect(api.refreshSessionTokens).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('revoca en el backend y limpia la sesión local', async () => {
      await signOut();

      expect(api.logoutBackend).toHaveBeenCalledWith('access');
      expect(auth.signOut).toHaveBeenCalledWith();
    });

    it('limpia la sesión local aunque falle el backend', async () => {
      api.logoutBackend.mockRejectedValue(new Error('offline'));

      await signOut();

      expect(auth.signOut).toHaveBeenCalled();
    });

    it('propaga el error de Supabase', async () => {
      auth.getSession.mockResolvedValue({ data: { session: null } });
      auth.signOut.mockResolvedValue({ error: new Error('storage') });

      await expect(signOut()).rejects.toThrow('storage');
      expect(api.logoutBackend).not.toHaveBeenCalled();
    });
  });

  it('signOutLocally no avisa al backend', async () => {
    await signOutLocally();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(api.logoutBackend).not.toHaveBeenCalled();
  });
});
