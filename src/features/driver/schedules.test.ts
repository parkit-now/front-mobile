import { describe, expect, it } from 'vitest';
import { weeklySchedule } from './schedules';

describe('weeklySchedule', () => {
  it('arma la semana completa con días cerrados y rangos partidos', () => {
    const rows = weeklySchedule([
      { day: 'saturday', openMinute: 17 * 60, closeMinute: 21 * 60 },
      { day: 'monday', openMinute: 7 * 60, closeMinute: 22 * 60 },
      { day: 'saturday', openMinute: 8 * 60, closeMinute: 13 * 60 },
    ]);

    expect(rows.map((row) => row.label)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
    expect(rows[0]).toMatchObject({ hours: '07:00–22:00', closed: false });
    expect(rows[1]).toMatchObject({ hours: 'Cerrado', closed: true });
    expect(rows[5].hours).toBe('08:00–13:00 · 17:00–21:00');
    expect(rows[6].hours).toBe('Cerrado');
  });

  it('muestra 24 h y el cierre a medianoche como 24:00', () => {
    const rows = weeklySchedule([
      { day: 'monday', openMinute: 0, closeMinute: 1440 },
      { day: 'tuesday', openMinute: 20 * 60, closeMinute: 1440 },
    ]);
    expect(rows[0].hours).toBe('Abierto 24 h');
    expect(rows[1].hours).toBe('20:00–24:00');
  });
});
