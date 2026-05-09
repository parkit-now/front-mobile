import { createClient } from '@supabase/supabase-js';

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

export const supabase = createClient(supabaseUrlRaw, supabaseAnonKeyRaw);
