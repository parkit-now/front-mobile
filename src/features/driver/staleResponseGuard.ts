/**
 * Evita que una lectura vieja pise un cambio local (p. ej. el sondeo de
 * "esperando aceptación" que responde después de cancelar). Cada lectura toma
 * un número al empezar; si mientras tanto hubo una escritura local sobre esa
 * reserva (o sigue en curso), su respuesta se descarta.
 */
export type StaleResponseGuard = {
  /** Anota que empieza una lectura de `id` y devuelve su número. */
  beginRead: (id: string) => number;
  /** ¿Se puede aplicar la respuesta de la lectura `ticket`? */
  canApply: (id: string, ticket: number) => boolean;
  /** Anota que empieza una escritura local sobre `id`. */
  beginWrite: (id: string) => void;
  /** Anota que terminó (bien o mal) la escritura local sobre `id`. */
  endWrite: (id: string) => void;
  /** ¿Hay alguna escritura local en curso? */
  hasPendingWrites: () => boolean;
};

export function createStaleResponseGuard(): StaleResponseGuard {
  let counter = 0;
  const lastWrite = new Map<string, number>();
  const writing = new Map<string, number>();

  return {
    beginRead: () => ++counter,
    canApply: (id, ticket) =>
      !writing.has(id) && ticket > (lastWrite.get(id) ?? 0),
    beginWrite: (id) => {
      writing.set(id, (writing.get(id) ?? 0) + 1);
    },
    endWrite: (id) => {
      const left = (writing.get(id) ?? 1) - 1;
      if (left <= 0) writing.delete(id);
      else writing.set(id, left);
      lastWrite.set(id, ++counter);
    },
    hasPendingWrites: () => writing.size > 0,
  };
}
