import type { components } from '../../generated/api-types';

type ProblemDetails = components['schemas']['ProblemDetailsDto'];
type ValidationProblemDetails =
  components['schemas']['ValidationProblemDetailsDto'];

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | ValidationProblemDetails | null;

  constructor(
    status: number,
    message: string,
    problem: ProblemDetails | ValidationProblemDetails | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

export const TIMEOUT_MESSAGE = 'La conexión tardó demasiado. Probá de nuevo.';
export const DEFAULT_TIMEOUT_MS = 20_000;

/** La llamada no respondió dentro del tiempo permitido (se abortó el fetch). */
export class ApiTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(TIMEOUT_MESSAGE);
    this.name = 'ApiTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

function readBaseUrl(): string {
  const raw: unknown = process.env.EXPO_PUBLIC_API_URL;
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('Missing EXPO_PUBLIC_API_URL in environment');
  }

  return raw.replace(/\/+$/, '');
}

function isProblem(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const maybe = value as Record<string, unknown>;
  return typeof maybe.detail === 'string' && typeof maybe.title === 'string';
}

async function parseProblem(
  response: Response,
): Promise<ProblemDetails | ValidationProblemDetails | null> {
  try {
    const body: unknown = await response.json();
    if (isProblem(body)) {
      return body;
    }
    return null;
  } catch {
    return null;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Registra qué hacer cuando el backend rechaza una llamada AUTENTICADA con 401
 * (token vencido o revocado que Supabase no pudo refrescar). Un 401 sin token
 * —p. ej. credenciales incorrectas en el login— no lo dispara. Devuelve la
 * función para desregistrarlo.
 */
export function setUnauthorizedHandler(
  handler: UnauthorizedHandler,
): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  bearer?: string;
  /** Milisegundos antes de abortar la llamada. Por defecto 20 s. */
  timeoutMs?: number;
};

export async function apiRequest<TResponse>(
  options: RequestOptions,
): Promise<TResponse> {
  const baseUrl = readBaseUrl();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.bearer) {
    headers.Authorization = `Bearer ${options.bearer}`;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${options.path}`, {
      method: options.method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 204) {
      return undefined as TResponse;
    }

    if (!response.ok) {
      if (response.status === 401 && options.bearer) {
        unauthorizedHandler?.();
      }
      const problem = await parseProblem(response);
      const message =
        problem?.detail ?? `Request failed with status ${response.status}`;
      throw new ApiError(response.status, message, problem);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (timedOut) throw new ApiTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
