import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { hasSupabaseEnv } from './src/lib/supabase/env';
import { getAccessToken } from './src/lib/supabase/session';

export default function App() {
  const [token, setToken] = useState('');

  const envReady = hasSupabaseEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  async function handleReadToken() {
    const value = await getAccessToken();
    setToken(value ?? 'No hay sesión activa');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>front-mobile</Text>
        <Text>Preset: mobile</Text>
        <Text>Supabase env: {envReady ? 'ok' : 'missing'}</Text>
        <Button
          title="Leer access token"
          onPress={() => {
            void handleReadToken();
          }}
        />
        <Text numberOfLines={4}>{token}</Text>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef7f3',
  },
  card: {
    width: '86%',
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
});
