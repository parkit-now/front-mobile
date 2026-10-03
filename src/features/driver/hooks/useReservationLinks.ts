import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef } from 'react';
import type { DriverRootParamList } from '../navigation';
import { parseReservationLink } from '../reservationLinks';

// El link con el que se abrió la app se atiende una sola vez, aunque el
// componente se vuelva a montar (cierre y apertura de sesión).
let initialUrlHandled = false;

/**
 * Deep links de la vuelta del checkout:
 *   - en frío, `getInitialURL` (la app se abre desde parkit://reservas/:id o
 *     exp://…/--/reservas/:id);
 *   - en caliente, el evento `url` (el Custom Tab redirige al returnUrl).
 * Los dos llevan a la pantalla de la reserva, que confirma el pago contra el
 * backend. Si el navegador todavía no está listo, el destino espera a `onReady`.
 */
export function useReservationLinks(
  navigationRef: NavigationContainerRefWithCurrent<DriverRootParamList>,
) {
  const pending = useRef<string | null>(null);

  const open = useCallback(
    (url: string | null) => {
      const link = parseReservationLink(url);
      if (!link) return;
      if (!navigationRef.isReady()) {
        pending.current = link.reservationId;
        return;
      }
      navigationRef.navigate('ReservationDetail', {
        reservationId: link.reservationId,
        returnedAt: Date.now(),
      });
    },
    [navigationRef],
  );

  useEffect(() => {
    if (!initialUrlHandled) {
      initialUrlHandled = true;
      void Linking.getInitialURL().then(open);
    }
    const subscription = Linking.addEventListener('url', (event) => {
      open(event.url);
    });
    return () => {
      subscription.remove();
    };
  }, [open]);

  /** Para el `onReady` del NavigationContainer. */
  return useCallback(() => {
    if (!pending.current) return;
    const reservationId = pending.current;
    pending.current = null;
    navigationRef.navigate('ReservationDetail', {
      reservationId,
      returnedAt: Date.now(),
    });
  }, [navigationRef]);
}
