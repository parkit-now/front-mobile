import type { components } from '../../generated/api-types';
import { apiRequest } from './client';

type LoginDto = components['schemas']['LoginDto'];
// TODO: quitar el `& { name }` al sincronizar los tipos del API (el contrato ya exige `name`).
type RegisterDto = components['schemas']['RegisterDto'] & { name: string };
type RefreshDto = components['schemas']['RefreshDto'];

export type SessionDto = components['schemas']['SessionDto'];
export type AuthSessionResponseDto =
  components['schemas']['AuthSessionResponseDto'];

export function loginWithPassword(input: LoginDto): Promise<SessionDto> {
  return apiRequest<SessionDto>({
    method: 'POST',
    path: '/auth/login',
    body: input,
  });
}

export function registerWithPassword(
  input: RegisterDto,
): Promise<AuthSessionResponseDto> {
  return apiRequest<AuthSessionResponseDto>({
    method: 'POST',
    path: '/auth/register',
    body: input,
  });
}

export function refreshSessionTokens(input: RefreshDto): Promise<SessionDto> {
  return apiRequest<SessionDto>({
    method: 'POST',
    path: '/auth/refresh',
    body: input,
  });
}

export function logoutBackend(accessToken: string): Promise<void> {
  return apiRequest<void>({
    method: 'POST',
    path: '/auth/logout',
    bearer: accessToken,
  });
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiRequest<void>({
    method: 'POST',
    path: '/auth/forgot-password',
    body: { email },
  });
}
