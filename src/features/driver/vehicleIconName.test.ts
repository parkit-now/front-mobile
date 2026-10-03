import { describe, expect, it } from 'vitest';
import { vehicleIconName } from './vehicles';

describe('vehicleIconName', () => {
  it('elige un ícono por categoría', () => {
    expect(vehicleIconName('car')).toBe('car');
    expect(vehicleIconName('suv')).toBe('suv');
    expect(vehicleIconName('pickup')).toBe('pickup');
    expect(vehicleIconName('van')).toBe('van');
    expect(vehicleIconName('motorcycle')).toBe('moto');
    expect(vehicleIconName('other')).toBe('car');
  });
});
