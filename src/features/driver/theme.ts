export const driverColors = {
  background: '#eef4ff',
  surface: '#ffffff',
  text: '#101828',
  textSecondary: '#475467',
  textMuted: '#667085',
  border: '#d0d9e6',
  brand: '#0e5fd8',
  brandStrong: '#0b3f91',
  brandSoft: '#f7faff',
  success: '#027a48',
  successSurface: '#ecfdf3',
  warning: '#b54708',
  warningSurface: '#fffaeb',
  danger: '#b42318',
  dangerSurface: '#fff1ef',
  disabled: '#98a2b3',
  overlay: 'rgba(16, 24, 40, 0.48)',
  mapBackground: '#e5edf7',
  mapRoad: '#ffffff',
  mapRoadSecondary: '#f7faff',
  mapBlockWarm: '#fff7df',
  mapBlockGreen: '#d9f4e7',
  mapWater: '#bfe7ff',
  mapWaterStrong: '#94d3f7',
} as const;

// Escala de disponibilidad (ver availability.ts). Colores auxiliares de mapa:
// viven en la feature según SHARED_STYLE_GUIDE y no se usan como UI general.
// `marker`/`markerText` pintan el pin del mapa; `text`/`surface`, los badges.
export const availabilityColors = {
  high: {
    text: '#027a48',
    surface: '#ecfdf3',
    marker: '#079455',
    markerText: '#ffffff',
  },
  medium: {
    text: '#854a0e',
    surface: '#fefbe8',
    marker: '#facc15',
    markerText: '#101828',
  },
  low: {
    text: '#b93815',
    surface: '#fef6ee',
    marker: '#ef6820',
    markerText: '#ffffff',
  },
  critical: {
    text: '#b42318',
    surface: '#fff1ef',
    marker: '#d92d20',
    markerText: '#ffffff',
  },
  unknown: {
    text: '#475467',
    surface: '#f2f4f7',
    marker: '#667085',
    markerText: '#ffffff',
  },
} as const;

export const driverSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
} as const;

export const driverRadius = {
  chip: 10,
  control: 14,
  card: 20,
} as const;

export const driverLayout = {
  maxContentWidth: 560,
  horizontalPadding: 18,
} as const;

// Ámbar de "esperando confirmación" (anillo, reloj, borde del lugar).
export const amberColors = {
  text: '#b54708',
  strong: '#dc6803',
  surface: '#fffaeb',
  border: '#fedf89',
  track: '#fdeac6',
} as const;

// Ticket de la reserva y su talón con el autito (ver components/reservation-motion).
export const ticketColors = {
  ink: '#0a1f44',
  inkSoft: '#22314f',
  meta: '#4a5a78',
  label: '#6b7a96',
  badgeTop: '#2a7af0',
  badgeBottom: '#0b4fc0',
  perforation: '#c9d6ea',
  slotBase: '#c4d2e9',
  stub: '#f6f9ff',
  stubMuted: '#f4f5f7',
  infoSurface: '#f2f4f7',
  infoBorder: '#d0d5dd',
  infoInk: '#475467',
  cardDivider: '#edf1f8',
  plateBorder: '#d5deec',
  tabTrack: '#e3eaf6',
  tabCount: '#dde6f5',
  tabCountText: '#33456a',
} as const;

// Chips de estado de "Mis reservas" y del ticket.
export const chipColors = {
  amber: {
    text: amberColors.text,
    surface: amberColors.surface,
    border: amberColors.border,
  },
  blue: { text: driverColors.brand, surface: '#e6effd', border: '#c3d7fa' },
  green: {
    text: driverColors.success,
    surface: driverColors.successSurface,
    border: '#abefc6',
  },
  slate: { text: '#475467', surface: '#f2f4f7', border: '#e4e7ec' },
  rose: { text: driverColors.danger, surface: '#fef3f2', border: '#fecdca' },
  refund: {
    text: driverColors.brandStrong,
    surface: '#eef4ff',
    border: '#d4e2fb',
  },
} as const;
