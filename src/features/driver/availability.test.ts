import { describe, expect, it } from 'vitest';
import { availabilityLabel, availabilityLevel } from './availability';

describe('availabilityLevel', () => {
  it('clasifica por porcentaje de lugares libres', () => {
    expect(availabilityLevel(12, 20)).toBe('high');
    expect(availabilityLevel(7, 25)).toBe('medium');
    expect(availabilityLevel(4, 30)).toBe('low');
    expect(availabilityLevel(1, 30)).toBe('critical');
    expect(availabilityLevel(0, 30)).toBe('critical');
  });

  it('respeta los bordes de cada escalón', () => {
    expect(availabilityLevel(51, 100)).toBe('high');
    expect(availabilityLevel(50, 100)).toBe('medium');
    expect(availabilityLevel(25, 100)).toBe('medium');
    expect(availabilityLevel(24, 100)).toBe('low');
    expect(availabilityLevel(10, 100)).toBe('low');
    expect(availabilityLevel(9, 100)).toBe('critical');
  });

  it('sin dato confiable devuelve unknown, nunca lleno', () => {
    expect(availabilityLevel(null, 30)).toBe('unknown');
    expect(availabilityLevel(5, null)).toBe('unknown');
    expect(availabilityLevel(5, 0)).toBe('unknown');
    expect(availabilityLevel(-1, 30)).toBe('unknown');
  });

  it('no supera el 100 % si hay más libres que capacidad', () => {
    expect(availabilityLevel(40, 30)).toBe('high');
  });
});

describe('availabilityLabel', () => {
  it('pluraliza y distingue sin lugares de sin datos', () => {
    expect(availabilityLabel(1)).toBe('1 lugar libre ahora');
    expect(availabilityLabel(12)).toBe('12 lugares libres ahora');
    expect(availabilityLabel(0)).toBe('Sin lugares ahora');
    expect(availabilityLabel(null)).toBe('Disponibilidad sin datos');
  });
});
