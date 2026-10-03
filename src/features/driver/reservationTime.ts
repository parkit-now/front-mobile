import type { ParkingSchedule } from './mock';

export type ReservationDateOption = {
  key: string;
  label: string;
  shortLabel: string;
  day: ParkingSchedule['day'];
};

export type ReservationTimeOption = {
  minute: number;
  label: string;
  iso: string;
};

const TIME_ZONE = 'America/Argentina/Buenos_Aires';
const DAY_BY_INDEX: ParkingSchedule['day'][] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function reservationDates(
  maxDays: number,
  now = new Date(),
): ReservationDateOption[] {
  const today = datePartsInBuenosAires(now);
  const start = Date.UTC(today.year, today.month - 1, today.day);
  return Array.from({ length: Math.max(1, maxDays) }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    const day = DAY_BY_INDEX[date.getUTCDay()];
    const formatted = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
    return {
      key,
      day,
      label: index === 0 ? `Hoy, ${formatted}` : formatted,
      shortLabel: index === 0 ? 'Hoy' : formatted,
    };
  });
}

export function entryTimeOptions(
  date: ReservationDateOption,
  schedules: ParkingSchedule[],
  now = new Date(),
): ReservationTimeOption[] {
  const today = datePartsInBuenosAires(now);
  const todayKey = keyFromParts(today);
  const currentMinute = today.hour * 60 + today.minute;
  const minimum = date.key === todayKey ? ceilToHalfHour(currentMinute + 1) : 0;

  return schedules
    .filter((schedule) => schedule.day === date.day)
    .flatMap((schedule) =>
      minuteOptions(
        date.key,
        Math.max(schedule.openMinute, minimum),
        schedule.closeMinute - 30,
      ),
    );
}

export function exitDateTimeOptions(
  date: ReservationDateOption,
  entryMinute: number,
  schedules: ParkingSchedule[],
): ReservationTimeOption[] {
  const options: ReservationTimeOption[] = [];
  let dateKey = date.key;
  let minute = entryMinute;

  // El backend admite hasta 24 h. Avanzamos en pasos de 30 min mientras cada
  // tramo permanezca dentro de horarios contiguos, incluso al día siguiente.
  for (let step = 0; step < 48; step += 1) {
    if (!isOpenInterval(dateKey, minute, schedules)) break;
    minute += 30;
    if (minute === 1440) {
      dateKey = addDays(dateKey, 1);
      minute = 0;
    }
    const label = formatScheduleMinute(minute);
    options.push({
      minute,
      label:
        dateKey === date.key ? label : `${shortDateLabel(dateKey)} ${label}`,
      iso: `${dateKey}T${label}:00-03:00`,
    });
  }
  return options;
}

export function formatScheduleMinute(minute: number): string {
  const normalized = minute === 1440 ? 0 : minute;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function minuteOptions(
  dateKey: string,
  fromMinute: number,
  throughMinute: number,
): ReservationTimeOption[] {
  const start = ceilToHalfHour(fromMinute);
  const options: ReservationTimeOption[] = [];
  for (let minute = start; minute <= throughMinute; minute += 30) {
    const label = formatScheduleMinute(minute);
    const isoDate = minute === 1440 ? addDays(dateKey, 1) : dateKey;
    options.push({
      minute,
      label,
      iso: `${isoDate}T${label}:00-03:00`,
    });
  }
  return options;
}

function ceilToHalfHour(minute: number): number {
  return Math.ceil(minute / 30) * 30;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isOpenInterval(
  dateKey: string,
  minute: number,
  schedules: ParkingSchedule[],
): boolean {
  const day = DAY_BY_INDEX[new Date(`${dateKey}T12:00:00Z`).getUTCDay()];
  return schedules.some(
    (schedule) =>
      schedule.day === day &&
      minute >= schedule.openMinute &&
      minute + 30 <= schedule.closeMinute,
  );
}

function shortDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function datePartsInBuenosAires(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

function keyFromParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

// ─── Calendario ─────────────────────────────────────────────────────────────

export type CalendarCell = { key: string; day: number } | null;

/** 'YYYY-MM' del día. */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function shiftMonth(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

/**
 * Semanas del mes, de lunes a domingo (como el calendario argentino). Los
 * huecos antes del día 1 y después del último día son `null`.
 */
export function monthGrid(monthKey: string): CalendarCell[][] {
  const [year, month] = monthKey.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay(): 0 = domingo. Lunes primero: domingo va al final.
  const leading = (first.getUTCDay() + 6) % 7;
  const cells: CalendarCell[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: `${monthKey}-${String(day).padStart(2, '0')}`, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

/** "Octubre de 2026". */
export function monthTitle(monthKey: string): string {
  const title = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthKey}-15T12:00:00Z`));
  return title.charAt(0).toLocaleUpperCase('es-AR') + title.slice(1);
}

/** "sáb, 4 oct". */
export function dayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

/** Hora "HH:MM" de un ISO con offset de Buenos Aires ("2026-10-04T10:30:00-03:00"). */
export function timeOfIso(iso: string): string {
  return iso.slice(11, 16);
}

/** Día "YYYY-MM-DD" de un ISO con offset de Buenos Aires. */
export function dayOfIso(iso: string): string {
  return iso.slice(0, 10);
}

// ─── Horario de reservas ────────────────────────────────────────────────────

/**
 * Rangos en los que se puede reservar: la intersección del horario de apertura
 * con el horario de reservas del dueño (`reservationHours`). El backend exige
 * las dos cosas (RESERVATION_OUTSIDE_OPENING_HOURS y
 * RESERVATION_OUTSIDE_RESERVATION_HOURS), así que el selector sólo ofrece lo
 * que cae dentro de ambos. Con `reservationHours` vacío (no informado) vale el
 * horario de apertura.
 */
export function effectiveReservationSchedules(
  opening: ParkingSchedule[],
  reservationHours: ParkingSchedule[],
): ParkingSchedule[] {
  if (reservationHours.length === 0) return opening;
  // Sin horario de apertura cargado el backend no lo valida: rige el de reservas.
  if (opening.length === 0) return reservationHours;
  return opening.flatMap((open) =>
    reservationHours
      .filter((hours) => hours.day === open.day)
      .flatMap((hours) => {
        const openMinute = Math.max(open.openMinute, hours.openMinute);
        const closeMinute = Math.min(open.closeMinute, hours.closeMinute);
        return closeMinute > openMinute
          ? [{ day: open.day, openMinute, closeMinute }]
          : [];
      }),
  );
}
