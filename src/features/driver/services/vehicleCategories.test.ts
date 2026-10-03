import { describe, expect, it } from 'vitest';
import { toReservableCategories } from './vehicleCategories';

describe('toReservableCategories', () => {
  it('deja sólo las reservables, ordenadas, con su etiqueta', () => {
    const rows = [
      { code: 'motorcycle', label: 'Moto', sortOrder: 5, reservable: true },
      { code: 'truck', label: 'Camión', sortOrder: 7, reservable: false },
      {
        code: 'van',
        label: 'Utilitario / Van',
        sortOrder: 4,
        reservable: true,
      },
      { code: 'car', label: 'Auto', sortOrder: 1, reservable: true },
    ] as const;
    expect(toReservableCategories([...rows])).toEqual([
      { code: 'car', label: 'Auto' },
      { code: 'van', label: 'Utilitario / Van' },
      { code: 'motorcycle', label: 'Moto' },
    ]);
  });
});
