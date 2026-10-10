import { ApiError, ApiTimeoutError, TIMEOUT_MESSAGE } from './client';

/**
 * Traduce errores del backend a mensajes en español.
 *
 * Precedencia (de mayor a menor especificidad):
 *   1. `problem.code` — identificador estable que define el backend (catálogo
 *      en backend/src/utils/exceptions/error-codes.ts). Es la fuente de verdad.
 *   2. `(endpoint, status)` — fallback cuando el backend no manda code
 *      (clientes viejos o paths no cubiertos).
 *   3. `status` — fallback genérico por HTTP status.
 *   4. Mensaje genérico, nunca el `error.message` crudo (viene en inglés).
 *
 * Para agregar un caso nuevo: pedile al backend el `code` y agregalo al
 * diccionario CODE_MESSAGES. No hacer string matching del `detail`.
 */

export type EndpointKey =
  | 'auth.login'
  | 'auth.register'
  | 'auth.refresh'
  | 'auth.logout'
  | 'auth.forgotPassword'
  | 'users.me'
  | 'driver.parkings'
  | 'driver.parkingDetail'
  | 'driver.quote'
  | 'driver.reservations'
  | 'driver.cancelReservation'
  | 'driver.cancelPreview'
  | 'driver.reservationPayment'
  | 'driver.vehicles';

export type TranslateContext = {
  endpoint?: EndpointKey;
};

const GENERIC_MESSAGE = 'Ocurrió un error inesperado.';
const NETWORK_MESSAGE =
  'No pudimos conectarnos con el servidor. Verificá tu conexión.';

// Catalogo estable de `code` provisto por el backend.
// Fuente: backend/src/utils/exceptions/error-codes.ts
const CODE_MESSAGES: Record<string, string> = {
  ARCA_PRIMARY_REQUIRED: 'Primero vinculá la cuenta primaria de ARCA.',
  ARCA_ACCOUNT_DUPLICATE:
    'Ya existe una cuenta con ese CUIT, entorno y punto de venta.',
  ARCA_ACCOUNT_UNAVAILABLE:
    'La cuenta elegida ya no está disponible. La factura conserva su emisor y queda pendiente.',
  INVOICE_EMITTER_LOCKED:
    'La emisión anterior debe resolverse con su cuenta original antes de cambiar el emisor.',
  VEHICLE_NOT_FOUND: 'No encontramos el vehículo.',
  VEHICLE_DUPLICATE: 'Ya tenés un vehículo con esa marca y modelo.',
  // Tipos de vehículo (ABM por estacionamiento)
  VEHICLE_TYPE_NOT_FOUND: 'No encontramos el tipo de vehículo.',
  VEHICLE_TYPE_DUPLICATE: 'Ya tenés un tipo de vehículo con ese nombre.',
  VEHICLE_TYPE_IN_USE:
    'Hay vehículos usando este tipo. Elegí a cuál moverlos antes de eliminarlo.',
  VEHICLE_TYPE_REASSIGN_TARGET_INVALID:
    'El tipo elegido para reasignar no es válido. Actualizá la lista y probá de nuevo.',
  // Auth
  AUTH_INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
  AUTH_REFRESH_INVALID: 'Tu sesión expiró. Volvé a iniciar sesión.',
  AUTH_MISSING_TOKEN: 'Tu sesión expiró. Volvé a iniciar sesión.',
  AUTH_INVALID_TOKEN: 'Tu sesión expiró. Volvé a iniciar sesión.',
  AUTH_USER_NOT_PROVISIONED:
    'Tu cuenta todavía no está habilitada. Contactá al administrador.',
  AUTH_EMAIL_ALREADY_EXISTS: 'Ya existe una cuenta con ese email.',
  AUTH_WEAK_PASSWORD:
    'La contraseña es demasiado débil. Probá una más larga o variada.',
  AUTH_REGISTER_FAILED:
    'No pudimos crear tu cuenta. Intentalo en unos segundos.',
  AUTH_LOGOUT_FAILED: 'No pudimos cerrar la sesión. Probá de nuevo.',
  AUTH_RESET_TOKEN_INVALID:
    'El link para recuperar tu contraseña venció o ya fue usado. Pedí uno nuevo.',
  AUTH_RESET_PASSWORD_FAILED:
    'No pudimos cambiar tu contraseña. Intentalo en unos segundos.',

  // Conductor
  DRIVER_PARKING_NOT_FOUND: 'Este estacionamiento ya no está disponible.',
  DRIVER_RESERVATIONS_DISABLED:
    'Este estacionamiento no acepta reservas anticipadas.',
  RESERVATION_EXIT_NOT_AFTER_ENTRY:
    'La hora de salida debe ser posterior al ingreso.',
  RESERVATION_ENTRY_IN_PAST: 'Elegí un horario de ingreso futuro.',
  RESERVATION_ENTRY_TOO_FAR:
    'Sólo podés reservar dentro de los próximos 7 días.',
  RESERVATION_STAY_TOO_LONG: 'La reserva no puede superar las 24 horas.',
  RESERVATION_OUTSIDE_OPENING_HOURS:
    'El estacionamiento está cerrado en parte del horario elegido.',
  RESERVATION_OUTSIDE_RESERVATION_HOURS:
    'Ese horario está fuera del horario en que el estacionamiento toma reservas. Elegí otro.',
  RESERVATION_NO_CAPACITY: 'Se ocupó el último lugar, probá otra franja.',
  RESERVATION_NOT_FOUND: 'No encontramos esa reserva.',
  RESERVATION_NOT_CANCELLABLE: 'La reserva ya empezó o ya estaba cancelada.',
  RESERVATION_ID_CONFLICT: 'No pudimos crear la reserva. Intentá de nuevo.',
  RESERVATION_VEHICLE_NOT_FOUND: 'Elegí uno de tus vehículos para reservar.',
  RESERVATION_VEHICLE_CATEGORY_NOT_ACCEPTED:
    'Este estacionamiento no acepta reservas para ese tipo de vehículo.',
  RESERVATION_HOLD_EXPIRED:
    'Se venció el tiempo para pagar y liberamos el lugar. Hacé la reserva de nuevo.',
  RESERVATION_CHECKOUT_UNAVAILABLE:
    'No pudimos abrir el pago con Mercado Pago. Probá de nuevo en unos minutos.',
  RESERVATION_CLIENT_OUTDATED:
    'Esta versión de la app ya no puede pagar reservas. Actualizá Parkit para continuar.',
  RESERVATION_RETURN_URL_NOT_ALLOWED:
    'No pudimos preparar la vuelta a la app después del pago. Actualizá Parkit e intentá de nuevo.',
  RESERVATION_ALREADY_PAID: 'Esta reserva ya está paga.',
  RESERVATION_NOT_PAYABLE: 'Esta reserva ya no se puede pagar.',
  // Mercado Pago (el conductor sólo los ve al pedir el checkout)
  MP_NOT_LINKED:
    'Este estacionamiento no puede cobrar con Mercado Pago por ahora.',
  MP_ACCOUNT_TOKEN_EXPIRED:
    'Este estacionamiento no puede cobrar con Mercado Pago por ahora.',
  MP_ACCOUNT_REVOKED:
    'Este estacionamiento no puede cobrar con Mercado Pago por ahora.',
  MP_PREFERENCE_CREATE_FAILED:
    'No pudimos abrir el pago con Mercado Pago. Probá de nuevo en unos minutos.',
  MP_UNAVAILABLE:
    'Mercado Pago no responde ahora. Probá de nuevo en unos minutos.',
  MP_UNREACHABLE:
    'Mercado Pago no responde ahora. Probá de nuevo en unos minutos.',
  MP_MALFORMED_RESPONSE:
    'Mercado Pago no responde ahora. Probá de nuevo en unos minutos.',
  DRIVER_VEHICLE_NOT_FOUND: 'No encontramos ese vehículo.',
  DRIVER_VEHICLE_PLATE_TAKEN: 'Ya tenés un vehículo con esta patente.',
  DRIVER_VEHICLE_HAS_ACTIVE_RESERVATION:
    'Este vehículo tiene una reserva activa: no podés cambiar la patente ni el tipo, ni eliminarlo.',
  DRIVER_VEHICLE_PRIMARY_REQUIRED:
    'Para cambiar el principal, marcá otro vehículo como principal.',

  // Validacion (envoltorio — el detalle por campo se traduce con
  // translateValidationCode).
  VALIDATION_FAILED: 'Revisá los datos del formulario.',

  // Facturación
  INVOICE_MODE_DISABLED:
    'La facturación está desactivada para el medio de pago de esta estadía.',

  // Genericos por status
  BAD_REQUEST: 'La solicitud tiene datos inválidos.',
  UNAUTHORIZED: 'No tenés autorización para esta acción.',
  FORBIDDEN: 'No tenés permiso para esta acción.',
  NOT_FOUND: 'No encontramos lo que buscabas.',
  CONFLICT: 'Conflicto con el estado actual.',
  UNPROCESSABLE_ENTITY: 'Algunos datos no son válidos.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Esperá unos segundos.',
  INTERNAL_ERROR: 'El servidor no responde. Intentalo en unos segundos.',
  SERVICE_UNAVAILABLE: 'El servidor no responde. Intentalo en unos segundos.',
  GATEWAY_TIMEOUT: 'El servidor tardó demasiado. Intentalo en unos segundos.',

  // Persistencia
  DB_NOT_FOUND: 'No encontramos lo que buscabas.',
  DB_UNIQUE_CONSTRAINT: 'Ese dato ya está en uso.',
  DB_FOREIGN_KEY_VIOLATION: 'Una referencia obligatoria no es válida.',
  DB_VALIDATION_ERROR: 'Algunos datos no son válidos.',
  DB_CONNECTION_TIMEOUT:
    'El servidor está saturado. Intentalo en unos segundos.',
  DB_ERROR: 'El servidor no responde. Intentalo en unos segundos.',
};

// Fallback `(endpoint, status)` solo si el backend no envia `code`.
const CONTEXT_MESSAGES: Record<string, string> = {
  'auth.login:401': 'Email o contraseña incorrectos.',
  'auth.register:409': 'Ya existe una cuenta con ese email.',
  'auth.refresh:401': 'Tu sesión expiró. Volvé a iniciar sesión.',
  'auth.logout:401': 'Tu sesión ya no es válida.',
  'users.me:401': 'Tu sesión expiró. Volvé a iniciar sesión.',
};

// Fallback final por HTTP status.
const STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud tiene datos inválidos.',
  401: 'No tenés autorización para esta acción.',
  403: 'No tenés permiso para esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'Conflicto con el estado actual.',
  422: 'Algunos datos no son válidos.',
  429: 'Demasiados intentos. Esperá unos segundos.',
  500: 'El servidor no responde. Intentalo en unos segundos.',
  502: 'El servidor no responde. Intentalo en unos segundos.',
  503: 'El servidor no responde. Intentalo en unos segundos.',
  504: 'El servidor no responde. Intentalo en unos segundos.',
};

function readProblemCode(error: ApiError): string | undefined {
  const code = (error.problem as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code.length > 0 ? code : undefined;
}

export function translateApiError(
  error: unknown,
  ctx: TranslateContext = {},
): string {
  if (error instanceof ApiError) {
    const code = readProblemCode(error);
    if (code && CODE_MESSAGES[code]) {
      return CODE_MESSAGES[code];
    }
    if (ctx.endpoint) {
      const contextual = CONTEXT_MESSAGES[`${ctx.endpoint}:${error.status}`];
      if (contextual) return contextual;
    }
    const byStatus = STATUS_MESSAGES[error.status];
    if (byStatus) return byStatus;
    return GENERIC_MESSAGE;
  }

  if (error instanceof ApiTimeoutError) return TIMEOUT_MESSAGE;

  // fetch() falla con TypeError cuando no hay red.
  if (error instanceof TypeError) {
    return NETWORK_MESSAGE;
  }

  return GENERIC_MESSAGE;
}

// Traducciones de los `code` que devuelve cada `ValidationFieldErrorDto`.
// Coinciden con los constraint names de class-validator que usa el backend.
const VALIDATION_CODE_MESSAGES: Record<string, string> = {
  isNotEmpty: 'Este campo es obligatorio.',
  isDefined: 'Este campo es obligatorio.',
  isString: 'Valor inválido.',
  isNumber: 'Debe ser un número.',
  isInt: 'Debe ser un número entero.',
  isBoolean: 'Debe ser verdadero o falso.',
  isEmail: 'Email inválido.',
  isUUID: 'Identificador inválido.',
  isDate: 'Fecha inválida.',
  isIn: 'Valor no permitido.',
  isEnum: 'Valor no permitido.',
  minLength: 'Demasiado corto.',
  maxLength: 'Demasiado largo.',
  min: 'Valor demasiado bajo.',
  max: 'Valor demasiado alto.',
};

// Override por (field, code) para mensajes mas contextuales.
const VALIDATION_FIELD_CODE_MESSAGES: Record<string, string> = {
  'password:minLength': 'La contraseña debe tener al menos 8 caracteres.',
  'password:isNotEmpty': 'Ingresá tu contraseña.',
  'email:isEmail': 'Email inválido.',
  'email:isNotEmpty': 'Ingresá tu email.',
};

/**
 * Traduce un `ValidationFieldErrorDto.code` (constraint name de
 * class-validator) al mensaje en español que va abajo del input.
 */
export function translateValidationCode(field: string, code: string): string {
  const overrideKey = `${field.toLowerCase()}:${code}`;
  const override = VALIDATION_FIELD_CODE_MESSAGES[overrideKey];
  if (override) return override;
  return VALIDATION_CODE_MESSAGES[code] ?? 'Valor inválido.';
}
