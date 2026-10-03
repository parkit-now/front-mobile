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
