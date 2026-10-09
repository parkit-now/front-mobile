import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { translateApiError } from './translate';

const problem = (code: string, status: number) =>
  new ApiError(status, 'x', {
    type: 'about:blank',
    title: 'x',
    status,
    detail: 'english detail',
    instance: '/driver/reservations',
    code,
  } as ConstructorParameters<typeof ApiError>[2]);

describe('errores de reservas y pago', () => {
  it.each([
    [
      'RESERVATION_NO_CAPACITY',
      409,
      'Se ocupó el último lugar, probá otra franja.',
    ],
    ['RESERVATION_VEHICLE_CATEGORY_NOT_ACCEPTED', 422, 'tipo de vehículo'],
    ['RESERVATION_OUTSIDE_RESERVATION_HOURS', 422, 'horario'],
    ['RESERVATION_HOLD_EXPIRED', 409, 'tiempo para pagar'],
    ['RESERVATION_CHECKOUT_UNAVAILABLE', 503, 'Mercado Pago'],
    ['RESERVATION_CLIENT_OUTDATED', 422, 'Actualizá'],
    ['RESERVATION_RETURN_URL_NOT_ALLOWED', 400, 'vuelta a la app'],
    ['RESERVATION_ALREADY_PAID', 409, 'ya está paga'],
    ['RESERVATION_NOT_PAYABLE', 409, 'ya no se puede pagar'],
    ['MP_UNAVAILABLE', 502, 'Mercado Pago'],
    ['MP_NOT_LINKED', 422, 'no puede cobrar'],
    ['INVOICE_MODE_DISABLED', 409, 'facturación está desactivada'],
  ])('%s se traduce al español', (code, status, fragment) => {
    const message = translateApiError(problem(code, status));
    expect(message).toContain(fragment);
    expect(message).not.toContain('english detail');
  });
});
