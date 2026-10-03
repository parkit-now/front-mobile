import { describe, expect, it } from 'vitest';
import {
  dayLabel,
  dayOfIso,
  entryTimeOptions,
  exitDateTimeOptions,
  monthGrid,
  monthTitle,
  reservationDates,
  shiftMonth,
  timeOfIso,
} from './reservationTime';

const schedules = [
  { day: 'sunday' as const, openMinute: 8 * 60, closeMinute: 12 * 60 },
];

describe('reservation time options', () => {
  it('offers seven dates starting today in Buenos Aires', () => {
    const dates = reservationDates(7, new Date('2026-09-27T13:00:00Z'));
    expect(dates).toHaveLength(7);
    expect(dates[0]).toMatchObject({ key: '2026-09-27', day: 'sunday' });
  });

  it('uses half-hour entries within opening hours and after now', () => {
    const [date] = reservationDates(7, new Date('2026-09-27T11:10:00Z'));
    const options = entryTimeOptions(
      date,
      schedules,
      new Date('2026-09-27T11:10:00Z'),
    );
    expect(options[0].label).toBe('08:30');
    expect(options.at(-1)?.label).toBe('11:30');
  });

  it('only offers exits after entry and before closing', () => {
    const [date] = reservationDates(7, new Date('2026-09-27T10:00:00Z'));
    expect(
      exitDateTimeOptions(date, 10 * 60, schedules).map((item) => item.label),
    ).toEqual(['10:30', '11:00', '11:30', '12:00']);
  });

  it('continues on the following day when opening is contiguous', () => {
    const [date] = reservationDates(7, new Date('2026-09-27T10:00:00Z'));
    const alwaysOpen = [
      { day: 'sunday' as const, openMinute: 0, closeMinute: 1440 },
      { day: 'monday' as const, openMinute: 0, closeMinute: 1440 },
    ];
    const options = exitDateTimeOptions(date, 23 * 60 + 30, alwaysOpen);
    expect(options[0]).toMatchObject({
      label: 'lun 00:00',
      iso: '2026-09-28T00:00:00-03:00',
    });
    expect(options).toHaveLength(48);
  });
});

describe('calendario', () => {
  it('arma las semanas de lunes a domingo con huecos al principio y al final', () => {
    // Octubre 2026 empieza un jueves y termina un sábado.
    const weeks = monthGrid('2026-10');
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]).toEqual({ key: '2026-10-01', day: 1 });
    expect(weeks[4][5]).toEqual({ key: '2026-10-31', day: 31 });
    expect(weeks[4][6]).toBeNull();
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('cambia de mes, también entre años', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
  });

  it('formatea el mes, el día y separa día y hora de un ISO', () => {
    expect(monthTitle('2026-10')).toMatch(/^Octubre de 2026$/);
    expect(dayLabel('2026-10-03')).toMatch(/s[aá]b.*3.*oct/);
    expect(dayOfIso('2026-10-04T00:30:00-03:00')).toBe('2026-10-04');
    expect(timeOfIso('2026-10-04T00:30:00-03:00')).toBe('00:30');
  });
});
