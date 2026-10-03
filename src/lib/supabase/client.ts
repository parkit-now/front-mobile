import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrlRaw: unknown = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyRaw: unknown = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (
  typeof supabaseUrlRaw !== 'string' ||
  !supabaseUrlRaw ||
  typeof supabaseAnonKeyRaw !== 'string' ||
  !supabaseAnonKeyRaw
) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment',
  );
}

// React Native no tiene localStorage: sin un storage explícito la sesión vive
// solo en memoria y se pierde al cerrar o recargar la app (SCRUM-279).
// detectSessionInUrl queda apagado porque los deep links de OAuth y recovery
// los hidrata session.ts a mano.
export const supabase = createClient(supabaseUrlRaw, supabaseAnonKeyRaw, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// El refresco automático del token usa timers que el SO congela en segundo
// plano: se pausa al salir y se reanuda al volver, como indica Supabase para RN.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
