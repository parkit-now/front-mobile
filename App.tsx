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
import { ToastProvider, useToast } from './src/lib/notifications/ToastProvider';
import {
  getSession,
  hydrateSessionFromUrl,
  onSessionChange,
} from './src/lib/supabase/session';

type AuthView = 'login' | 'register';

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AuthView>('login');

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
          showToast({ message: getErrorMessage(error), kind: 'error' });
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
          showToast({ message: getErrorMessage(error), kind: 'error' });
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
  }, [showToast]);

  return (
    <SafeAreaView style={authStyles.page}>
      <View style={authStyles.card}>
        <BrandHeader />

        {loading ? (
          <Text style={authStyles.muted}>Cargando sesión...</Text>
        ) : session ? (
          <SessionView session={session} />
        ) : view === 'register' ? (
          <RegisterScreen
            onSwitchToLogin={() => {
              setView('login');
            }}
          />
        ) : (
          <LoginScreen
            onSwitchToRegister={() => {
              setView('register');
            }}
          />
        )}
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
