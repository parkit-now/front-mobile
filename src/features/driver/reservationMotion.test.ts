import { describe, expect, it } from 'vitest';
import {
  advanceMotion,
  approvalCountdown,
  INITIAL_MOTION,
  approvalPollDelay,
  approvalProgress,
  approvalRemainingMs,
  decideMotion,
  motionHaptic,
  outcomeStage,
  rejectionVariant,
  springFor,
  stageAnnouncement,
  whenLabel,
  type OutcomeStage,
} from './reservationMotion';
import { makeBooking } from './testFixtures';

describe('outcomeStage', () => {
  it('confirmando el pago siempre es "paying"', () => {
    expect(outcomeStage('confirmed', true)).toBe('paying');
    expect(outcomeStage(null, true)).toBe('paying');
  });

  it('mapea cada fase a su etapa', () => {
    expect(outcomeStage('awaiting_payment', false)).toBe('paying');
    expect(outcomeStage('payment_rejected', false)).toBe('paying');
    expect(outcomeStage('awaiting_approval', false)).toBe('pending');
    expect(outcomeStage('confirmed', false)).toBe('confirmed');
    expect(outcomeStage('in_progress', false)).toBe('confirmed');
    expect(outcomeStage('rejected', false)).toBe('rejected');
  });

  it('el resto de las fases no usan la pantalla animada', () => {
    for (const phase of [
      'expired',
      'cancelled',
      'cancelled_by_owner',
      'completed',
      'no_show',
    ] as const) {
      expect(outcomeStage(phase, false)).toBeNull();
    }
    expect(outcomeStage(null, false)).toBeNull();
  });
});

describe('decideMotion', () => {
  const cases: Array<[OutcomeStage | null, OutcomeStage | null, string]> = [
    ['paying', 'confirmed', 'celebrate'],
    ['paying', 'pending', 'payToPending'],
    ['pending', 'confirmed', 'accept'],
    ['pending', 'rejected', 'reject'],
    // Abrir una reserva que ya estaba así: quieta, sin festejo.
    [null, 'confirmed', 'still'],
    [null, 'rejected', 'still'],
    [null, 'pending', 'still'],
    // Re-render o re-foco con la misma etapa: nunca se repite.
    ['confirmed', 'confirmed', 'still'],
    ['pending', 'pending', 'still'],
    // Transiciones sin coreografía propia.
    ['paying', 'rejected', 'still'],
    ['confirmed', 'rejected', 'still'],
    ['pending', 'paying', 'still'],
    ['pending', null, 'still'],
  ];
  it.each(cases)('%s → %s = %s', (prev, next, expected) => {
    expect(decideMotion(prev, next)).toBe(expected);
  });
});

describe('motionHaptic', () => {
  it('éxito al confirmar, toque suave al pagar y nada al rechazar', () => {
    expect(motionHaptic('celebrate')).toBe('success');
    expect(motionHaptic('accept')).toBe('success');
    expect(motionHaptic('payToPending')).toBe('light');
    expect(motionHaptic('reject')).toBeNull();
    expect(motionHaptic('still')).toBeNull();
  });
});

describe('plazo de aprobación', () => {
  const deadline = '2026-10-03T23:45:00.000Z';
  const at = (iso: string) => new Date(iso).getTime();

  it('lo que queda nunca es negativo', () => {
    expect(approvalRemainingMs(deadline, at('2026-10-03T23:44:00.000Z'))).toBe(
      60_000,
    );
    expect(approvalRemainingMs(deadline, at('2026-10-03T23:50:00.000Z'))).toBe(
      0,
    );
    expect(approvalRemainingMs(null, 0)).toBe(0);
  });

  it('el anillo es la fracción real del plazo que queda', () => {
    expect(approvalProgress(deadline, 15, at('2026-10-03T23:30:00.000Z'))).toBe(
      1,
    );
    expect(
      approvalProgress(deadline, 15, at('2026-10-03T23:37:30.000Z')),
    ).toBeCloseTo(0.5);
    expect(approvalProgress(deadline, 15, at('2026-10-03T23:46:00.000Z'))).toBe(
      0,
    );
    // Un reloj del celular atrasado no pasa de lleno.
    expect(approvalProgress(deadline, 15, at('2026-10-03T23:00:00.000Z'))).toBe(
      1,
    );
    expect(approvalProgress(null, 15, 0)).toBe(0);
  });

  it('cuenta regresiva mm:ss redondeando para arriba', () => {
    expect(approvalCountdown(15 * 60_000)).toEqual({
      kind: 'counting',
      label: '15:00',
    });
    expect(approvalCountdown(14 * 60_000 + 59_001)).toEqual({
      kind: 'counting',
      label: '15:00',
    });
    expect(approvalCountdown(61_000)).toEqual({
      kind: 'counting',
      label: '01:01',
    });
    expect(approvalCountdown(1)).toEqual({ kind: 'counting', label: '00:01' });
  });

  it('en cero no da por vencida la reserva: "estamos confirmando"', () => {
    expect(approvalCountdown(0)).toEqual({ kind: 'confirming' });
    expect(approvalCountdown(-5)).toEqual({ kind: 'confirming' });
  });
});

describe('approvalPollDelay', () => {
  it('cada 5 s los primeros 2 min y después cada 10 s', () => {
    expect(approvalPollDelay(0)).toBe(5_000);
    expect(approvalPollDelay(119_999)).toBe(5_000);
    expect(approvalPollDelay(120_000)).toBe(10_000);
    expect(approvalPollDelay(600_000)).toBe(10_000);
  });
});

describe('rejectionVariant', () => {
  it('"Sin respuesta" cuando venció el plazo de aprobación', () => {
    expect(rejectionVariant({ reason: 'approval_timeout' })).toBe(
      'no_response',
    );
  });

  it('rechazo del estacionamiento con o sin motivo', () => {
    expect(rejectionVariant({ reason: 'Corte de luz' })).toBe('rejected');
    expect(rejectionVariant({ reason: null })).toBe('rejected');
  });
});

describe('whenLabel', () => {
  it('mismo día: fecha y rango de horas', () => {
    expect(
      whenLabel(
        makeBooking({
          entry: { dateLabel: 'sáb, 3 oct', timeLabel: '20:30' },
          exit: { dateLabel: 'sáb, 3 oct', timeLabel: '21:00' },
        }),
      ),
    ).toBe('sáb 3 oct · 20:30 – 21:00');
  });

  it('quita los puntos que agrega Hermes', () => {
    expect(
      whenLabel(
        makeBooking({
          entry: { dateLabel: 'sáb., 3 oct.', timeLabel: '20:30' },
          exit: { dateLabel: 'sáb., 3 oct.', timeLabel: '21:00' },
        }),
      ),
    ).toBe('sáb 3 oct · 20:30 – 21:00');
  });

  it('días distintos: las dos fechas', () => {
    expect(
      whenLabel(
        makeBooking({
          entry: { dateLabel: 'sáb, 3 oct', timeLabel: '22:00' },
          exit: { dateLabel: 'dom, 4 oct', timeLabel: '08:00' },
        }),
      ),
    ).toBe('sáb 3 oct 22:00 – dom 4 oct 08:00');
  });
});

describe('stageAnnouncement', () => {
  const booking = makeBooking({ parkingName: 'Estacionamiento Once' });

  it('anuncia cada etapa en castellano', () => {
    expect(stageAnnouncement('pending', booking)).toBe(
      'Solicitud enviada. Pagaste $4.500 y falta que Estacionamiento Once confirme tu lugar.',
    );
    expect(stageAnnouncement('confirmed', booking)).toBe(
      'Reserva confirmada. Tenés tu lugar en Estacionamiento Once.',
    );
    expect(
      stageAnnouncement('rejected', { ...booking, reason: 'Corte de luz' }),
    ).toMatch(/rechazó la reserva\. Te devolvemos \$4\.500/);
    expect(
      stageAnnouncement('rejected', { ...booking, reason: 'approval_timeout' }),
    ).toMatch(/no respondió a tiempo/);
    expect(stageAnnouncement('paying', booking)).toBeNull();
  });
});

describe('springFor', () => {
  it('reproduce el resorte del prototipo (ζ 0,7 en 700 ms)', () => {
    const spring = springFor(700, 0.7);
    // ω = 7,5 / (0,7 · 0,7 s) ≈ 15,31 rad/s
    expect(spring.stiffness).toBeCloseTo(234.3, 0);
    expect(spring.damping).toBeCloseTo(21.43, 1);
    expect(spring.damping / (2 * Math.sqrt(spring.stiffness))).toBeCloseTo(
      0.7,
      2,
    );
  });

  it('más corto es más rígido', () => {
    expect(springFor(460, 0.7).stiffness).toBeGreaterThan(
      springFor(700, 0.7).stiffness,
    );
  });
});

describe('advanceMotion', () => {
  const visible = { focused: true, alreadyAnimated: false };

  it('misma etapa: no cambia nada (re-render)', () => {
    const state = {
      stage: 'confirmed' as const,
      kind: 'still' as const,
      key: 3,
    };
    expect(advanceMotion(state, 'confirmed', visible)).toBe(state);
  });

  it('del pago a confirmada: festeja y cambia la clave', () => {
    const paying = advanceMotion(INITIAL_MOTION, 'paying', visible);
    expect(paying).toEqual({ stage: 'paying', kind: 'still', key: 1 });
    expect(advanceMotion(paying, 'confirmed', visible)).toEqual({
      stage: 'confirmed',
      kind: 'celebrate',
      key: 2,
    });
  });

  it('abrir una reserva ya confirmada: quieta', () => {
    expect(advanceMotion(INITIAL_MOTION, 'confirmed', visible).kind).toBe(
      'still',
    );
  });

  it('sin foco no se anima', () => {
    const pending = {
      stage: 'pending' as const,
      kind: 'still' as const,
      key: 1,
    };
    expect(
      advanceMotion(pending, 'confirmed', {
        focused: false,
        alreadyAnimated: false,
      }).kind,
    ).toBe('still');
  });

  it('una etapa ya festejada para esta reserva no se repite', () => {
    const pending = {
      stage: 'pending' as const,
      kind: 'still' as const,
      key: 1,
    };
    expect(
      advanceMotion(pending, 'confirmed', {
        focused: true,
        alreadyAnimated: true,
      }).kind,
    ).toBe('still');
  });
});
