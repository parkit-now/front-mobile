import { type Provider, type Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import {
  logoutBackend,
  loginWithPassword,
  refreshSessionTokens,
  registerWithPassword,
  type SessionDto,
} from '../api/auth';
import { supabase } from './client';

const DEFAULT_OAUTH_REDIRECT_URL = 'parkit://auth/callback';

WebBrowser.maybeCompleteAuthSession();

export function getOAuthRedirectUrl(): string {
  const customRedirect: unknown =
    process.env.EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL;

  if (typeof customRedirect === 'string' && customRedirect.length > 0) {
    return customRedirect;
  }

  return DEFAULT_OAUTH_REDIRECT_URL;
}

function parseUrlParams(url: string): Record<string, string> {
  const hashStart = url.indexOf('#');
  const queryStart = url.indexOf('?');

  const rawParams =
    hashStart >= 0
      ? url.slice(hashStart + 1)
      : queryStart >= 0
        ? url.slice(queryStart + 1)
        : '';

  if (!rawParams) {
    return {};
  }

  return rawParams.split('&').reduce<Record<string, string>>((acc, pair) => {
    if (!pair) {
      return acc;
    }

    const [rawKey, rawValue = ''] = pair.split('=');
    if (!rawKey) {
      return acc;
    }

    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawValue.replace(/\+/g, '%20'));
    acc[key] = value;

    return acc;
  }, {});
}

async function applyBackendSession(tokens: SessionDto): Promise<Session> {
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('No se pudo establecer la sesión local.');
  }

  return data.session;
}

export async function hydrateSessionFromUrl(
  url?: string | null,
): Promise<void> {
  if (!url) {
    return;
  }

  const params = parseUrlParams(url);

  if (params.error_description) {
    throw new Error(params.error_description);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }
}

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export function onSessionChange(
  callback: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function signInWithProvider(provider: Provider): Promise<void> {
  const redirectTo = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  const authUrl = data?.url;
  if (!authUrl) {
    throw new Error('Supabase no devolvió URL de OAuth.');
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

  if (result.type === 'success') {
    await hydrateSessionFromUrl(result.url);
    return;
  }

  if (
    result.type === WebBrowser.WebBrowserResultType.CANCEL ||
    result.type === WebBrowser.WebBrowserResultType.DISMISS
  ) {
    return;
  }

  throw new Error('No se pudo completar el flujo OAuth en mobile.');
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<Session> {
  const tokens = await loginWithPassword({ email, password });
  return applyBackendSession(tokens);
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<Session> {
  const result = await registerWithPassword({
    name: name.trim(),
    email,
    password,
  });
  return applyBackendSession(result.session);
}

export async function refreshCurrentSession(): Promise<Session | null> {
  const current = await getSession();
  if (!current?.refresh_token) {
    return null;
  }
  const tokens = await refreshSessionTokens({
    refreshToken: current.refresh_token,
  });
  return applyBackendSession(tokens);
}

export async function signOut(): Promise<void> {
  const current = await getSession();
  const accessToken = current?.access_token;

  if (accessToken) {
    try {
      await logoutBackend(accessToken);
    } catch {
      // Backend revoke falló: igual limpiamos sesión local para no dejar al usuario atrapado.
    }
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
