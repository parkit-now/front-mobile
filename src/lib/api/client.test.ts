import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError, setUnauthorizedHandler } from './client';

function respond(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ title: 'x', detail: 'y' }), { status }),
      ),
    ),
  );
}

describe('apiRequest ante un 401', () => {
  const handler = vi.fn();
  let unregister: () => void;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
    unregister = setUnauthorizedHandler(handler);
  });

  afterEach(() => {
    unregister();
    handler.mockReset();
    vi.unstubAllGlobals();
  });

  it('avisa sesión vencida si la llamada iba autenticada', async () => {
    respond(401);
    await expect(
      apiRequest({ method: 'GET', path: '/driver/parkings', bearer: 't' }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('no avisa en un 401 sin token (credenciales incorrectas)', async () => {
    respond(401);
    await expect(
      apiRequest({ method: 'POST', path: '/auth/login', body: {} }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('no avisa en otros errores', async () => {
    respond(403);
    await expect(
      apiRequest({ method: 'GET', path: '/driver/parkings', bearer: 't' }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('apiRequest con timeout', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lanza ApiTimeoutError con mensaje en español si no hay respuesta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'));
            });
          }),
      ),
    );
    const result = apiRequest({ method: 'POST', path: '/x', timeoutMs: 50 });
    const assertion = expect(result).rejects.toMatchObject({
      name: 'ApiTimeoutError',
      message: 'La conexión tardó demasiado. Probá de nuevo.',
    });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });
});
