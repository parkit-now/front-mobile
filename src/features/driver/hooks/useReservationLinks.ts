import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef } from 'react';
import type { DriverRootParamList } from '../navigation';
import {
  parseReservationLink,
  type ReservationLink,
} from '../reservationLinks';

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
  const pending = useRef<ReservationLink | null>(null);

  // Sólo el redirect del checkout (trae `status`) arranca la espera del pago;
  // un link suelto abre la reserva y muestra el estado que tenga.
  const navigateTo = useCallback(
    (link: ReservationLink) => {
      navigationRef.navigate('ReservationDetail', {
        reservationId: link.reservationId,
        returnedAt: link.hint ? Date.now() : undefined,
      });
    },
    [navigationRef],
  );

  const open = useCallback(
    (url: string | null) => {
      const link = parseReservationLink(url);
      if (!link) return;
      if (!navigationRef.isReady()) {
        pending.current = link;
        return;
      }
      navigateTo(link);
    },
    [navigationRef, navigateTo],
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
    const link = pending.current;
    pending.current = null;
    navigateTo(link);
  }, [navigateTo]);
}
