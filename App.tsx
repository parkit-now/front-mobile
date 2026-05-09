import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  getSession,
  hydrateSessionFromUrl,
  onSessionChange,
  signInWithProvider,
  signOut,
} from './src/lib/supabase/session';

type SocialProvider = 'google' | 'github';

type OAuthOption = {
  provider: SocialProvider;
  label: string;
};

const OAUTH_OPTIONS: OAuthOption[] = [
  { provider: 'google', label: 'Continuar con Google' },
  { provider: 'github', label: 'Continuar con GitHub' },
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrio un error inesperado.';
}

function BrandBadge() {
  return (
    <View style={styles.brandBadge}>
      <Svg
        width={44}
        height={44}
        viewBox="0 0 44 44"
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <LinearGradient
            id="parkitBadgeGradient"
            x1="0"
            y1="0"
            x2="44"
            y2="44"
          >
            <Stop offset="0" stopColor="#0e5fd8" />
            <Stop offset="1" stopColor="#0b3f91" />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={44}
          height={44}
          rx={12}
          fill="url(#parkitBadgeGradient)"
        />
      </Svg>
      <Text style={styles.brandLetter}>P</Text>
    </View>
  );
}

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === 'google') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          fill="#EA4335"
          d="M12 10.2v3.9h5.4c-.24 1.26-.96 2.34-2.04 3.06l3.3 2.58c1.92-1.77 3.03-4.38 3.03-7.47 0-.72-.06-1.41-.21-2.07H12z"
        />
        <Path
          fill="#34A853"
          d="M12 22c2.7 0 4.95-.9 6.6-2.46l-3.3-2.58c-.9.6-2.04.96-3.3.96-2.58 0-4.8-1.74-5.58-4.08l-3.42 2.64C4.62 19.68 8.04 22 12 22z"
        />
        <Path
          fill="#FBBC05"
          d="M6.42 13.86A6.58 6.58 0 0 1 6.12 12c0-.66.12-1.32.3-1.86L3 7.5A10.53 10.53 0 0 0 2 12c0 1.62.39 3.18 1 4.5l3.42-2.64z"
        />
        <Path
          fill="#4285F4"
          d="M12 6.12c1.44 0 2.7.48 3.72 1.44l2.82-2.82C16.95 3.3 14.7 2.4 12 2.4c-3.96 0-7.38 2.31-9 5.7l3.42 2.64C7.2 7.86 9.42 6.12 12 6.12z"
        />
      </Svg>
    );
  }

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#111827"
        d="M12 .5a11.5 11.5 0 0 0-3.63 22.42c.57.1.78-.25.78-.56v-2.15c-3.18.69-3.85-1.35-3.85-1.35-.52-1.33-1.28-1.69-1.28-1.69-1.04-.72.08-.71.08-.71 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.52-2.54-.29-5.21-1.27-5.21-5.64 0-1.25.44-2.26 1.18-3.06-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.17a10.9 10.9 0 0 1 5.77 0c2.2-1.48 3.17-1.17 3.17-1.17.62 1.59.23 2.76.11 3.05.74.8 1.18 1.81 1.18 3.06 0 4.38-2.68 5.35-5.23 5.63.41.35.77 1.03.77 2.08v3.08c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .5z"
      />
    </Svg>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        const initialUrl = await Linking.getInitialURL();
        await hydrateSessionFromUrl(initialUrl);

        const currentSession = await getSession();
        if (isMounted) {
          setSession(currentSession);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void initializeSession();

    const urlSubscription = Linking.addEventListener('url', (event) => {
      void (async () => {
        try {
          await hydrateSessionFromUrl(event.url);
        } catch (error) {
          setMessage(getErrorMessage(error));
        }
      })();
    });

    const unsubscribeAuth = onSessionChange((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      urlSubscription.remove();
      unsubscribeAuth();
    };
  }, []);

  async function handleSignIn(provider: SocialProvider) {
    setMessage('');
    setPendingProvider(provider);

    try {
      await signInWithProvider(provider);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleSignOut() {
    setMessage('');
    setPendingSignOut(true);

    try {
      await signOut();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPendingSignOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <View style={styles.brandLockup}>
          <BrandBadge />
          <View style={styles.brandCopy}>
            <Text style={styles.title}>Parkit</Text>
            <Text style={styles.subtitle}>
              Acceso seguro para tu operacion diaria
            </Text>
          </View>
        </View>

        {loading ? (
          <Text style={styles.muted}>Cargando sesion...</Text>
        ) : session ? (
          <>
            <Text style={styles.heading}>Welcome</Text>
            <Text style={styles.userPill}>
              {session.user.email ?? session.user.id}
            </Text>

            <Pressable
              style={[
                styles.signOutButton,
                pendingSignOut && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleSignOut();
              }}
              disabled={pendingSignOut}
            >
              <Text style={styles.signOutButtonText}>
                {pendingSignOut ? 'Cerrando...' : 'Cerrar sesion'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.heading}>Iniciar sesion</Text>
            <Text style={styles.muted}>Elegi tu proveedor para continuar.</Text>

            <View style={styles.oauthList}>
              {OAUTH_OPTIONS.map((option) => (
                <Pressable
                  key={option.provider}
                  style={[
                    styles.oauthButton,
                    pendingProvider !== null && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    void handleSignIn(option.provider);
                  }}
                  disabled={pendingProvider !== null}
                >
                  <ProviderIcon provider={option.provider} />
                  <Text style={styles.oauthButtonText}>
                    {pendingProvider === option.provider
                      ? 'Redirigiendo...'
                      : option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {message ? <Text style={styles.errorBanner}>{message}</Text> : null}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#eef4ff',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d9e6',
    gap: 12,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
    width: '100%',
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLetter: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    zIndex: 1,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#101828',
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#475467',
    lineHeight: 20,
    flexShrink: 1,
  },
  heading: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '700',
    color: '#101828',
  },
  muted: {
    marginTop: -2,
    fontSize: 14,
    color: '#475467',
  },
  oauthList: {
    marginTop: 8,
    gap: 10,
  },
  oauthButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d0d9e6',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  oauthButtonText: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d0d9e6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '600',
  },
  userPill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f5f8ff',
    color: '#1d2939',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorBanner: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f6c7bf',
    backgroundColor: '#fff1ef',
    color: '#b42318',
  },
});
