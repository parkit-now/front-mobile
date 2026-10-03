import { describe, expect, it, vi } from 'vitest';
import { pollReservation } from './pollReservation';
import { reservationPhase } from './reservationStatus';
import { makeBooking } from './testFixtures';

const pending = makeBooking({
  lifecycle: 'pending_payment',
  paymentStatus: 'created',
  holdExpiresAt: '2099-01-01T00:00:00.000Z',
});
const confirmed = makeBooking({ lifecycle: 'confirmed' });
const isSettled = (booking: typeof pending) =>
  reservationPhase(booking) !== 'awaiting_payment';

function clock() {
  let time = 0;
  return {
    now: () => time,
    sleep: (ms: number) => {
      time += ms;
      return Promise.resolve();
    },
  };
}

describe('pollReservation', () => {
  it('corta apenas el backend define el estado', async () => {
    const fetchOnce = vi
      .fn()
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(confirmed);
    const result = await pollReservation({ fetchOnce, isSettled, ...clock() });
    expect(result.outcome).toBe('settled');
    expect(result.booking?.lifecycle).toBe('confirmed');
    expect(fetchOnce).toHaveBeenCalledTimes(3);
  });

  it('consulta cada 2 s y se rinde a los 30 s', async () => {
    const fetchOnce = vi.fn().mockResolvedValue(pending);
    const time = clock();
    const sleeps: number[] = [];
    const result = await pollReservation({
      fetchOnce,
      isSettled,
      now: time.now,
      sleep: (ms) => {
        sleeps.push(ms);
        return time.sleep(ms);
      },
    });
    expect(result.outcome).toBe('timeout');
    expect(new Set(sleeps)).toEqual(new Set([2000]));
    expect(fetchOnce).toHaveBeenCalledTimes(16);
  });

  it('un error de red no corta la espera', async () => {
    const fetchOnce = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(confirmed);
    const result = await pollReservation({ fetchOnce, isSettled, ...clock() });
    expect(result.outcome).toBe('settled');
  });

  it('un pago rechazado también es un estado definido', async () => {
    const rejected = { ...pending, paymentStatus: 'rejected' };
    const result = await pollReservation({
      fetchOnce: () => Promise.resolve(rejected),
      isSettled,
      ...clock(),
    });
    expect(result.outcome).toBe('settled');
  });

  it('se puede abortar', async () => {
    const controller = new AbortController();
    const fetchOnce = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve(pending);
    });
    const result = await pollReservation({
      fetchOnce,
      isSettled,
      signal: controller.signal,
      ...clock(),
    });
    expect(result.outcome).toBe('aborted');
    expect(fetchOnce).toHaveBeenCalledTimes(1);
  });
});
