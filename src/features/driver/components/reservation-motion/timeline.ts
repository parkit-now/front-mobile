import {
  Easing,
  ReduceMotion,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { springFor } from '../../reservationMotion';

// Tiempos y curvas del prototipo aprobado ("Reserva Parkit en movimiento").
// Cada número sale del guion de la etapa: así se puede ajustar una pieza sin
// tocar los componentes.

/** Margen antes de arrancar, como el `lead` del prototipo. */
export const LEAD_MS = 80;

/** Curvas cúbicas del prototipo. */
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  brake: Easing.bezier(0.22, 1, 0.36, 1),
  reverse: Easing.bezier(0.5, 0, 0.75, 0),
  draw: Easing.bezier(0.55, 0, 0.25, 1),
  pulse: Easing.bezier(0.2, 0.7, 0.3, 1),
  breathe: Easing.inOut(Easing.ease),
  linear: Easing.linear,
};

/** Resorte con el sobrepaso del prototipo (ζ 0,7 ≈ 4,6 %). */
export function spring(durationMs: number, zeta = 0.7): WithSpringConfig {
  return { ...springFor(durationMs, zeta), reduceMotion: ReduceMotion.System };
}

/** Resortes con nombre: `soft` casi sin rebote, `pop` para tilde y autito. */
export const SPRING = {
  badge: spring(700),
  fill: spring(460),
  ticket: spring(720),
  text: spring(460),
  chip: spring(560),
  soft: spring(560, 0.85),
  carIn: spring(560, 0.6),
  carAccept: spring(640, 0.6),
  tab: {
    damping: 18,
    stiffness: 180,
    mass: 1,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
};

/** Fundido único de "Reducir movimiento": el estado final en ≤ 200 ms. */
export const REDUCED_FADE_MS = 200;

/**
 * Momento (ms desde el arranque, sin el `LEAD_MS`) de cada pieza en cada
 * coreografía. Ver la sección "Guion" del prototipo.
 */
export const T = {
  celebrate: {
    outline: 0,
    badge: 250,
    check: 290,
    glow: 300,
    pulse: 550,
    haptic: 550,
    ticket: 600,
    ticketTop: 660,
    code: 700,
    perforation: 760,
    paidLine: 880,
    stub: 960,
    car: 1080,
    slotOn: 1340,
    title: 1100,
    meta: 1160,
    info: 1160,
    cta: 1220,
  },
  payToPending: {
    okOut: 648,
    outline: 0,
    badge: 250,
    check: 290,
    glow: 300,
    haptic: 550,
    pending: 640,
    arc: 700,
    clock: 760,
    hand: 780,
    ticket: 700,
    ticketTop: 760,
    code: 800,
    perforation: 860,
    chip: 900,
    paidLine: 980,
    head: 1000,
    stub: 1060,
    info: 1080,
    cta: 1240,
    car: 1150,
    slotWait: 1500,
    breathe: 1900,
  },
  accept: {
    pendingOut: 347,
    ok: 300,
    check: 340,
    glow: 350,
    chip: 300,
    car: 380,
    slotOn: 880,
    head: 420,
    code: 480,
    pulse: 520,
    haptic: 520,
    info: 620,
    stub: 700,
    cta: 700,
  },
  reject: {
    pendingOut: 252,
    track: 60,
    car: 120,
    info: 220,
    stubGray: 260,
    chip: 260,
    head: 340,
    paidLine: 460,
    stub: 560,
    rows: 620,
    cta: 700,
  },
} as const;

/** Letra por letra del código. */
export const CODE_STAGGER_MS = 35;
/** Rayitas del troquelado. */
export const PERFORATION_STAGGER_MS = 12;
/** Tarjetas de Mis reservas. */
export const CARD_STAGGER_MS = 70;
/** Cuánto queda la tarjeta en su pestaña, ya cambiada, antes de irse. */
export const CARD_LINGER_MS = 900;
