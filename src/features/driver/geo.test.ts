import { describe, expect, it } from 'vitest';
import { PARKING_LOTS as ALL_PARKING_LOTS } from './mock';

// Fixture estable: los datos de demo pueden crecer sin romper estos casos.
const PARKING_LOTS = ALL_PARKING_LOTS.filter((parking) =>
  ['once-central', 'belgrano-norte', 'microcentro-sur'].includes(parking.id),
);
import { calculateDistanceMeters, discoverParkingLots } from './geo';

describe('calculateDistanceMeters', () => {
  it('calcula distancia geodésica aproximada', () => {
    const distance = calculateDistanceMeters(
      { latitude: -34.6037, longitude: -58.3816 },
      { latitude: -34.6098, longitude: -58.4079 },
    );

    expect(distance).toBeGreaterThan(2300);
    expect(distance).toBeLessThan(2700);
  });
});

describe('discoverParkingLots', () => {
  it('ordena y separa cocheras dentro del radio', () => {
    const result = discoverParkingLots(
      PARKING_LOTS,
      { latitude: -34.6037, longitude: -58.3816 },
      3000,
    );

    expect(result.nearby.map((parking) => parking.id)).toEqual([
      'microcentro-sur',
      'once-central',
    ]);
    expect(result.nearby[0].distanceLabel).toMatch(/m$/);
  });

  it('conserva las tres cocheras más cercanas como fallback', () => {
    const result = discoverParkingLots(
      PARKING_LOTS,
      { latitude: -34.92, longitude: -58.53 },
      1000,
    );

    expect(result.nearby).toEqual([]);
    expect(result.nearestFallback).toHaveLength(3);
    expect(result.nearestFallback[0].distanceMeters).toBeLessThanOrEqual(
      result.nearestFallback[1].distanceMeters,
    );
  });
});
