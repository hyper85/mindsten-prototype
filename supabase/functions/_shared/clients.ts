import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';

/** Model used for vision + story generation. Override with the ANTHROPIC_MODEL secret. */
export const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5-5';

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function anthropicClient(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY secret is not set');
  return new Anthropic({ apiKey, maxRetries: 1 });
}

/**
 * Returns true when the caller is within budget. Fails open if the rate-limit
 * RPC itself errors, so a DB hiccup doesn't take scanning down.
 */
export async function withinRateLimit(
  sb: SupabaseClient,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await sb.rpc('mindsten_bump_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('rate limit check failed', error);
    return true;
  }
  return data === true;
}

export function numberEnv(name: string, fallback: number): number {
  const v = Number(Deno.env.get(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
