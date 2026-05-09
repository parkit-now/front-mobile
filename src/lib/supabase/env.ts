export function hasSupabaseEnv(env: Record<string, unknown>): boolean {
  return (
    typeof env.EXPO_PUBLIC_SUPABASE_URL === 'string' &&
    env.EXPO_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof env.EXPO_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}
