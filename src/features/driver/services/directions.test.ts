import { describe, expect, it, vi } from 'vitest';
import { buildDirectionsUrl } from './directions';

vi.mock('react-native', () => ({ Linking: { openURL: vi.fn() } }));

describe('buildDirectionsUrl', () => {
  it('arma la URL universal de Google Maps con el destino como coordenadas', () => {
    expect(
      buildDirectionsUrl({ latitude: -34.6098, longitude: -58.4079 }),
    ).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-34.6098,-58.4079',
    );
  });
});
