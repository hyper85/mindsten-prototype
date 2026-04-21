import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Returns a configured Supabase client if both env vars are set, otherwise null.
 * Callers should treat `null` as "backend unavailable, use fixtures".
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!url || !anonKey) return null;
  client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return client;
}

export const isSupabaseConfigured = Boolean(url && anonKey);
