import { type Provider, type Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './client';

const DEFAULT_OAUTH_REDIRECT_URL = 'parkit://auth/callback';

WebBrowser.maybeCompleteAuthSession();

export function getOAuthRedirectUrl(): string {
  const customRedirect = process.env.EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL;

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
    throw new Error('Supabase no devolvio URL de OAuth.');
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

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
