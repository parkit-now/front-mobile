import { describe, expect, it, vi } from 'vitest';
import { displayAddress } from './driver';

vi.mock('../../../lib/api/client', () => ({ apiRequest: vi.fn() }));

describe('displayAddress', () => {
  it('deja calle y altura de la nomenclatura de Georef en tipo título', () => {
    expect(
      displayAddress(
        'BARTOLOME MITRE 2500, Comuna 3, Ciudad Autónoma de Buenos Aires',
      ),
    ).toBe('Bartolome Mitre 2500');
    expect(displayAddress('AV PUEYRREDON 1850, Comuna 2, CABA')).toBe(
      'Av. Pueyrredon 1850',
    );
    expect(displayAddress('AV DE MAYO 700')).toBe('Av. de Mayo 700');
    expect(displayAddress('AV GRAL LAS HERAS 2000')).toBe(
      'Av. Gral. Las Heras 2000',
    );
    expect(displayAddress('PASEO DE LA RECOLETA 50')).toBe(
      'Paseo de la Recoleta 50',
    );
  });

  it('no toca direcciones escritas por una persona', () => {
    expect(displayAddress('Av. Cabildo 2000, CABA')).toBe(
      'Av. Cabildo 2000, CABA',
    );
  });
});
