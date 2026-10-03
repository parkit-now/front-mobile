import { describe, expect, it } from 'vitest';
import {
  entryTimeOptions,
  exitDateTimeOptions,
  reservationDates,
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
