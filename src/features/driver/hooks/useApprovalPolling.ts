import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { approvalPollDelay } from '../reservationMotion';

type Options = {
  /** Pantalla enfocada y reserva esperando al estacionamiento. */
  enabled: boolean;
  /** Relee la reserva (GET /driver/reservations/:id). */
  poll: () => Promise<unknown>;
};

/**
 * Mientras la reserva espera que el estacionamiento la acepte, pregunta al
 * servidor con calma (cada 5 s, y cada 10 s después de 2 min). Se corta al
 * salir de la pantalla, con la app en segundo plano o cuando cambia el estado.
 *
 * TODO(notificaciones): reemplazar esta consulta periódica por la notificación
 * push del cambio de estado (ver docs/handoff/notificaciones-push.md).
 */
export function useApprovalPolling({ enabled, poll }: Options): void {
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active' || AppState.currentState == null,
  );
  const pollRef = useRef(poll);
  useEffect(() => {
    pollRef.current = poll;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!enabled || !appActive) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const tick = async () => {
      try {
        await pollRef.current();
      } catch {
        // Un error de red no corta la espera: se reintenta en el próximo ciclo.
      }
      if (cancelled) return;
      timer = setTimeout(
        () => {
          void tick();
        },
        approvalPollDelay(Date.now() - startedAt),
      );
    };
    // Al volver a la pantalla (o a la app) se pregunta enseguida.
    timer = setTimeout(() => {
      void tick();
    }, 0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, appActive]);
}
