// Vuelta del checkout. El conductor paga en el navegador (Custom Tab) y el
// backend lo devuelve a la app con un redirect al `returnUrl` que armamos acá.
//   - Expo Go:  exp://localhost:8081/--/reservas/<id>   (con `--localhost`)
//   - build:    parkit://reservas/<id>
//   - Expo web: http://localhost:8081/reservas/<id>
// El backend sólo acepta esos tres prefijos (RESERVATION_RETURN_URL_NOT_ALLOWED).

const RESERVATION_ID =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const RESERVATION_LINK = new RegExp(
  `(?:^|/)reservas/(${RESERVATION_ID})(?:[/?#]|$)`,
  'i',
);

/**
 * `createUrl` es `Linking.createURL` de expo-linking (se inyecta para poder
 * probar esto sin React Native): resuelve el esquema según dónde corre la app.
 */
export function buildReturnUrl(
  reservationId: string,
  createUrl: (path: string) => string,
): string {
  return createUrl(`reservas/${reservationId}`);
}

export type ReservationLink = {
  reservationId: string;
  /** Lo que informa el redirect. Es sólo una pista: el estado lo define el backend. */
  hint: 'approved' | 'rejected' | 'pending' | null;
};

/** Reconoce `…/reservas/<id>` en cualquiera de los esquemas; si no, `null`. */
export function parseReservationLink(
  url: string | null | undefined,
): ReservationLink | null {
  if (!url) return null;
  const match = RESERVATION_LINK.exec(url.split(/[?#]/)[0] + '/');
  if (!match) return null;
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const status = new URLSearchParams(query.split('#')[0]).get('status');
  return {
    reservationId: match[1].toLowerCase(),
    hint:
      status === 'approved' || status === 'rejected' || status === 'pending'
        ? status
        : null,
  };
}
