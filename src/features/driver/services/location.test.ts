import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLocationIfGranted, requestCurrentLocation } from './location';

const Location = vi.hoisted(() => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
  hasServicesEnabledAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  getLastKnownPositionAsync: vi.fn(),
}));

vi.mock('expo-location', () => Location);

const POSITION = { coords: { latitude: -34.6, longitude: -58.4 } };

describe('getLocationIfGranted', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve null sin preguntar si no hay permiso', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    await expect(getLocationIfGranted()).resolves.toBeNull();
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('devuelve la última posición conocida si hay permiso', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getLastKnownPositionAsync.mockResolvedValue(POSITION);

    const location = await getLocationIfGranted();

    expect(location?.coordinate).toEqual(POSITION.coords);
  });

  it('devuelve null si no hay posición conocida', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });
    Location.getLastKnownPositionAsync.mockResolvedValue(null);

    await expect(getLocationIfGranted()).resolves.toBeNull();
  });

  it('ignora los errores nativos', async () => {
    Location.getForegroundPermissionsAsync.mockRejectedValue(new Error('x'));

    await expect(getLocationIfGranted()).resolves.toBeNull();
  });
});

describe('requestCurrentLocation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
    });
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('informa el permiso denegado y si se puede volver a pedir', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    });

    await expect(requestCurrentLocation()).resolves.toEqual({
      destination: null,
      issue: { kind: 'permission-denied', canAskAgain: false },
    });
  });

  it('informa la ubicación del dispositivo apagada', async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(false);

    const result = await requestCurrentLocation();

    expect(result.issue).toEqual({
      kind: 'services-disabled',
      canAskAgain: false,
    });
  });

  it('devuelve la posición actual', async () => {
    Location.getCurrentPositionAsync.mockResolvedValue(POSITION);

    const result = await requestCurrentLocation();

    expect(result.issue).toBeNull();
    expect(result.destination?.coordinate).toEqual(POSITION.coords);
  });

  it('usa la última posición conocida si el GPS no responde a tiempo', async () => {
    vi.useFakeTimers();
    Location.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
    Location.getLastKnownPositionAsync.mockResolvedValue(POSITION);

    const pending = requestCurrentLocation();
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await pending;

    expect(result.destination?.coordinate).toEqual(POSITION.coords);
  });

  it('informa ubicación no disponible si no hay ninguna conocida', async () => {
    vi.useFakeTimers();
    Location.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
    Location.getLastKnownPositionAsync.mockResolvedValue(null);

    const pending = requestCurrentLocation();
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toEqual({
      destination: null,
      issue: { kind: 'unavailable', canAskAgain: true },
    });
  });

  it('informa ubicación no disponible si falla el GPS', async () => {
    Location.getCurrentPositionAsync.mockRejectedValue('gps error');

    const result = await requestCurrentLocation();

    expect(result.issue?.kind).toBe('unavailable');
  });
});
