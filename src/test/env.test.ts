import { describe, expect, it } from 'vitest';
import { hasSupabaseEnv } from '../lib/supabase/env';

describe('hasSupabaseEnv', () => {
  it('returns true when Expo public vars are present', () => {
    expect(
      hasSupabaseEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_123',
      }),
    ).toBe(true);
  });

  it('returns false when one var is missing', () => {
    expect(
      hasSupabaseEnv({
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      }),
    ).toBe(false);
  });
});
