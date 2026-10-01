import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Returns true when the caller is within budget. If the rate-limit RPC itself errors, a
 * per-IP bucket fails open (a DB hiccup doesn't take scanning down) while a global bucket
 * (`failClosed: true`) fails closed, so model spend stays capped.
 */
export async function withinRateLimit(
  sb: SupabaseClient,
  bucket: string,
  limit: number,
  windowSeconds: number,
  { failClosed = false }: { failClosed?: boolean } = {},
): Promise<boolean> {
  const { data, error } = await sb.rpc('mindsten_bump_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('rate limit check failed', bucket.split(':')[0], error.message);
    return !failClosed;
  }
  return data === true;
}

/** Per-IP bucket first (so a single client can't drain the global budget), then the global one. */
export async function checkRateLimits(
  sb: SupabaseClient,
  name: string,
  ip: string,
  perHour: number,
  perDay: number,
): Promise<boolean> {
  if (!(await withinRateLimit(sb, `${name}:${ip}`, perHour, 3600))) return false;
  return withinRateLimit(sb, `${name}:global`, perDay, 86400, { failClosed: true });
}

export function numberEnv(name: string, fallback: number): number {
  const v = Number(Deno.env.get(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** HMAC key for ask-person answer signatures: ASK_SIGNING_KEY, else the service role key. */
export function askSigningKey(): string {
  const key = Deno.env.get('ASK_SIGNING_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new Error('ASK_SIGNING_KEY / SUPABASE_SERVICE_ROLE_KEY missing');
  return key;
}
