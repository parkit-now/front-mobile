import { describe, expect, it } from 'vitest';
import { PARKING_LOTS as ALL_PARKING_LOTS } from './mock';

// Fixture estable: los datos de demo pueden crecer sin romper estos casos.
const PARKING_LOTS = ALL_PARKING_LOTS.filter((parking) =>
  ['once-central', 'belgrano-norte', 'microcentro-sur'].includes(parking.id),
);
import {
  filterMapParkingLots,
  filterParkingLots,
  priceAtPosition,
  priceSliderBounds,
} from './selectors';

describe('filterParkingLots', () => {
  it('busca por nombre, dirección o servicio sin depender de mayúsculas o tildes', () => {
    const result = filterParkingLots(PARKING_LOTS, {
      query: 'camara',
      reservationsOnly: false,
    });

    expect(result.map((parking) => parking.id)).toEqual(['belgrano-norte']);
  });

  it('filtra por reserva anticipada', () => {
    const result = filterParkingLots(PARKING_LOTS, {
      query: '',
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
      reservationsOnly: false,
    });

    expect(result).toEqual([]);
  });
});

describe('filterMapParkingLots', () => {
  it('combina disponibilidad actual y precio máximo', () => {
    const result = filterMapParkingLots(PARKING_LOTS, {
      availableOnly: true,
      maxHourlyPriceArs: 2000,
    });

    expect(result.map((parking) => parking.id)).toEqual(['once-central']);
  });

  it('no limita por precio cuando el máximo es null', () => {
    const result = filterMapParkingLots(PARKING_LOTS, {
      availableOnly: false,
      maxHourlyPriceArs: null,
    });

    expect(result.map((parking) => parking.id)).toEqual([
      'once-central',
      'belgrano-norte',
      'microcentro-sur',
    ]);
  });
});

describe('priceSliderBounds', () => {
  it('va de la más barata a la más cara, redondeado a $100', () => {
    expect(
      priceSliderBounds([{ hourlyPriceArs: 1850 }, { hourlyPriceArs: 2920 }]),
    ).toEqual({ min: 1800, max: 3000, step: 100 });
  });

  it('no hay slider con menos de dos precios distintos', () => {
    expect(priceSliderBounds([{ hourlyPriceArs: 1800 }])).toBeNull();
    expect(
      priceSliderBounds([{ hourlyPriceArs: 2000 }, { hourlyPriceArs: 2000 }]),
    ).toBeNull();
  });
});

describe('priceAtPosition', () => {
  const bounds = { min: 1800, max: 3000, step: 100 };

  it('convierte la posición en un precio ajustado al paso', () => {
    expect(priceAtPosition(0, 300, bounds)).toBe(1800);
    expect(priceAtPosition(150, 300, bounds)).toBe(2400);
    expect(priceAtPosition(101, 300, bounds)).toBe(2200);
    expect(priceAtPosition(300, 300, bounds)).toBe(3000);
  });

  it('se queda dentro del rango aunque el dedo salga de la barra', () => {
    expect(priceAtPosition(-40, 300, bounds)).toBe(1800);
    expect(priceAtPosition(400, 300, bounds)).toBe(3000);
  });
});
