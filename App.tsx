import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Linking, SafeAreaView, Text, View } from 'react-native';
import { BrandHeader } from './src/features/auth/BrandHeader';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { SessionView } from './src/features/auth/SessionView';
import { getErrorMessage } from './src/features/auth/errors';
import { authStyles } from './src/features/auth/styles';
import {
  getSession,
  hydrateSessionFromUrl,
  onSessionChange,
} from './src/lib/supabase/session';

type AuthView = 'login' | 'register';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AuthView>('login');
  const [bootError, setBootError] = useState('');

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
          setBootError(getErrorMessage(error));
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
          setBootError(getErrorMessage(error));
        }
      })();
    });

    const unsubscribeAuth = onSessionChange((nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setView('login');
      }
    });

    return () => {
      isMounted = false;
      urlSubscription.remove();
      unsubscribeAuth();
    };
  }, []);

  return (
    <SafeAreaView style={authStyles.page}>
      <ViewCard
        loading={loading}
        session={session}
        view={view}
        onSwitchToLogin={() => {
          setView('login');
        }}
        onSwitchToRegister={() => {
          setView('register');
        }}
        bootError={bootError}
      />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

type CardProps = {
  loading: boolean;
  session: Session | null;
  view: AuthView;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
  bootError: string;
};

function ViewCard({
  loading,
  session,
  view,
  onSwitchToLogin,
  onSwitchToRegister,
  bootError,
}: CardProps) {
  return (
    <View style={authStyles.card}>
      <BrandHeader />

      {loading ? (
        <Text style={authStyles.muted}>Cargando sesion...</Text>
      ) : session ? (
        <SessionView session={session} />
      ) : view === 'register' ? (
        <RegisterScreen onSwitchToLogin={onSwitchToLogin} />
      ) : (
        <LoginScreen onSwitchToRegister={onSwitchToRegister} />
      )}

      {bootError ? (
        <Text style={authStyles.errorBanner}>{bootError}</Text>
      ) : null}
    </View>
  );
}
