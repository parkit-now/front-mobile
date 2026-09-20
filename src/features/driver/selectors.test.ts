import { describe, expect, it } from 'vitest';
import { PARKING_LOTS } from './mock';
import { filterMapParkingLots, filterParkingLots } from './selectors';

describe('filterParkingLots', () => {
  it('busca por nombre, dirección o servicio sin depender de mayúsculas o tildes', () => {
    const result = filterParkingLots(PARKING_LOTS, {
      query: 'camara',
      vehicleKind: 'Moto',
      reservationsOnly: false,
    });

    expect(result.map((parking) => parking.id)).toEqual(['belgrano-norte']);
  });

  it('combina vehículo y reserva anticipada', () => {
    const result = filterParkingLots(PARKING_LOTS, {
      query: '',
      vehicleKind: 'Pickup',
      reservationsOnly: true,
    });

    expect(result.map((parking) => parking.id)).toEqual([
      'once-central',
      'microcentro-sur',
    ]);
  });

  it('devuelve una lista vacía cuando ningún estacionamiento coincide', () => {
    const result = filterParkingLots(PARKING_LOTS, {
      query: 'Palermo',
      vehicleKind: 'Auto',
      reservationsOnly: false,
    });

    expect(result).toEqual([]);
  });
});

describe('filterMapParkingLots', () => {
  it('combina vehículo, disponibilidad actual y precio máximo', () => {
    const result = filterMapParkingLots(PARKING_LOTS, {
      vehicleKind: 'Pickup',
      availableOnly: true,
      maxHourlyPriceArs: 2000,
    });

    expect(result.map((parking) => parking.id)).toEqual(['once-central']);
  });

  it('no limita por precio cuando el máximo es null', () => {
    const result = filterMapParkingLots(PARKING_LOTS, {
      vehicleKind: 'Moto',
      availableOnly: false,
      maxHourlyPriceArs: null,
    });

    expect(result.map((parking) => parking.id)).toEqual([
      'once-central',
      'belgrano-norte',
    ]);
  });
});
