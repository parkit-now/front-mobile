import { describe, expect, it } from 'vitest';
import { buildReturnUrl, parseReservationLink } from './reservationLinks';

const ID = '3f2b8c1e-9d4a-4e6b-8a7c-1b2d3e4f5a6b';

describe('buildReturnUrl', () => {
  it('delega el esquema en Linking.createURL', () => {
    const calls: string[] = [];
    const createUrl = (path: string) => {
      calls.push(path);
      return `exp://localhost:8081/--/${path}`;
    };
    expect(buildReturnUrl(ID, createUrl)).toBe(
      `exp://localhost:8081/--/reservas/${ID}`,
    );
    expect(calls).toEqual([`reservas/${ID}`]);
  });

  it.each([
    [`exp://localhost:8081/--/reservas/${ID}`],
    [`parkit://reservas/${ID}`],
    [`http://localhost:8081/reservas/${ID}`],
  ])('el resultado %s pasa la lista permitida del backend', (url) => {
    // Espejo de backend/src/reservations/return-url.ts.
    const allowed = ['parkit://', 'exp://', 'http://localhost:8081/'];
    expect(allowed.some((prefix) => url.startsWith(prefix))).toBe(true);
    expect(/\s/.test(url)).toBe(false);
  });
});

describe('parseReservationLink', () => {
  it.each([
    [`parkit://reservas/${ID}`],
    [`exp://192.168.0.5:8081/--/reservas/${ID}`],
    [
      `exp://localhost:8081/--/reservas/${ID}?reservationId=${ID}&status=approved`,
    ],
    [`http://localhost:8081/reservas/${ID}`],
  ])('reconoce %s', (url) => {
    expect(parseReservationLink(url)?.reservationId).toBe(ID);
  });

  it('lee el status del redirect sólo como pista', () => {
    expect(
      parseReservationLink(
        `parkit://reservas/${ID}?reservationId=${ID}&status=rejected`,
      )?.hint,
    ).toBe('rejected');
    expect(
      parseReservationLink(`parkit://reservas/${ID}?status=raro`)?.hint,
    ).toBe(null);
    expect(parseReservationLink(`parkit://reservas/${ID}`)?.hint).toBe(null);
  });

  it('ignora otros links (login, ids inválidos, vacío)', () => {
    expect(parseReservationLink(null)).toBeNull();
    expect(parseReservationLink('')).toBeNull();
    expect(parseReservationLink('parkit://auth/callback?code=abc')).toBeNull();
    expect(parseReservationLink('parkit://reservas/no-es-un-uuid')).toBeNull();
    expect(
      parseReservationLink(`parkit://otra-cosa/reservas-${ID}`),
    ).toBeNull();
  });
});
