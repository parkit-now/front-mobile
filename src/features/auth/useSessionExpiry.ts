import { useEffect, useRef } from 'react';
import { setUnauthorizedHandler } from '../../lib/api/client';
import { useToast } from '../../lib/notifications/ToastProvider';
import { signOutLocally } from '../../lib/supabase/session';

const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Volvé a iniciar sesión.';

/**
 * Si el backend rechaza una llamada autenticada (401), la sesión ya no sirve:
 * se cierra localmente y la app vuelve al login (App.tsx escucha el cambio de
 * sesión). Varias llamadas pueden fallar juntas; se actúa una sola vez.
 */
export function useSessionExpiry(): void {
  const { showToast } = useToast();
  const handling = useRef(false);

  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        if (handling.current) return;
        handling.current = true;
        showToast({ message: SESSION_EXPIRED_MESSAGE, kind: 'info' });
        void signOutLocally().finally(() => {
          handling.current = false;
        });
      }),
    [showToast],
  );
}
