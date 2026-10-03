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
