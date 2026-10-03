import type { ParkingSchedule } from './mock';
import { formatScheduleMinute } from './reservationTime';

export type WeeklyScheduleRow = {
  day: ParkingSchedule['day'];
  label: string;
  hours: string;
  closed: boolean;
};

const WEEK: Array<[ParkingSchedule['day'], string]> = [
  ['monday', 'Lunes'],
  ['tuesday', 'Martes'],
  ['wednesday', 'Miércoles'],
  ['thursday', 'Jueves'],
  ['friday', 'Viernes'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
];

// Semana completa de lunes a domingo: un día con varios rangos va en una sola
// fila ("08:00–13:00 · 17:00–21:00"), un día sin rangos dice "Cerrado" y
// 00:00–24:00 se lee "Abierto 24 h".
export function weeklySchedule(
  schedules: ParkingSchedule[],
): WeeklyScheduleRow[] {
  return WEEK.map(([day, label]) => {
    const ranges = schedules
      .filter((schedule) => schedule.day === day)
      .sort((left, right) => left.openMinute - right.openMinute);
    if (ranges.length === 0) {
      return { day, label, hours: 'Cerrado', closed: true };
    }
    if (
      ranges.length === 1 &&
      ranges[0].openMinute === 0 &&
      ranges[0].closeMinute === 1440
    ) {
      return { day, label, hours: 'Abierto 24 h', closed: false };
    }
    return {
      day,
      label,
      hours: ranges
        .map(
          (range) =>
            `${formatScheduleMinute(range.openMinute)}–${
              range.closeMinute === 1440
                ? '24:00'
                : formatScheduleMinute(range.closeMinute)
            }`,
        )
        .join(' · '),
      closed: false,
    };
  });
}
