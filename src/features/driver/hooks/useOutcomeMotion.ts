import { useEffect, useRef } from 'react';
import {
  advanceMotion,
  INITIAL_MOTION,
  type MotionState,
  type OutcomeStage,
} from '../reservationMotion';

/**
 * Última etapa animada de cada reserva en esta sesión de la app. Evita repetir
 * un festejo si la pantalla se vuelve a montar (otro deep link, volver atrás).
 */
const animatedStages = new Map<string, OutcomeStage>();

/**
 * Qué coreografía corre en la pantalla de la reserva. Se calcula durante el
 * render (no en un efecto) para que el primer frame de la etapa nueva ya
 * arranque en el estado inicial de su animación, sin parpadeo.
 */
export function useOutcomeMotion(
  reservationId: string,
  stage: OutcomeStage | null,
  focused: boolean,
): MotionState {
  const ref = useRef<{ id: string; state: MotionState }>({
    id: reservationId,
    state: INITIAL_MOTION,
  });
  if (ref.current.id !== reservationId) {
    ref.current = { id: reservationId, state: INITIAL_MOTION };
  }
  const current = ref.current.state;
  if (stage !== current.stage) {
    ref.current.state = advanceMotion(current, stage, {
      focused,
      alreadyAnimated:
        stage !== null && animatedStages.get(reservationId) === stage,
    });
  }
  const state = ref.current.state;

  useEffect(() => {
    if (state.kind !== 'still' && state.stage !== null) {
      animatedStages.set(reservationId, state.stage);
    }
  }, [reservationId, state]);

  return state;
}
