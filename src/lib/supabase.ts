import { FunctionsClient } from '@supabase/functions-js';
import { PostgrestClient } from '@supabase/postgrest-js';

const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The slice of the Supabase client the app uses: PostgREST queries/RPCs and Edge Functions.
 * Built from the two sub-packages instead of `@supabase/supabase-js`, which would also ship
 * auth, realtime and storage (~100 KB gzipped we never use).
 */
export interface Backend {
  from: PostgrestClient['from'];
  rpc: PostgrestClient['rpc'];
  functions: FunctionsClient;
}

let client: Backend | null = null;

/**
 * Returns a configured client if both env vars are set, otherwise null.
 * Callers should treat `null` as "backend unavailable, use fixtures".
 */
export function getSupabase(): Backend | null {
  if (client) return client;
  if (!url || !anonKey) return null;
  // Same headers supabase-js sends for an anonymous visitor.
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const rest = new PostgrestClient(`${url}/rest/v1`, { headers });
  client = {
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
    functions: new FunctionsClient(`${url}/functions/v1`, { headers }),
  };
  return client;
}

export const isSupabaseConfigured = Boolean(url && anonKey);
