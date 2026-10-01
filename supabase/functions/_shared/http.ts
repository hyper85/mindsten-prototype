// HTTP plumbing shared by the Edge Functions: CORS, JSON responses, body size limits,
// client IP and a serve() wrapper that turns unexpected errors into JSON 500s.
//
// Optional secret ALLOWED_ORIGINS: comma-separated origins allowed to call the functions
// from a browser, e.g. "https://mindsten.dk,https://*.vercel.app" ("*.vercel.app" = any
// https subdomain). Unset → any origin ("*").

const ALLOW_HEADERS = 'authorization, x-client-info, apikey, content-type';
const ALLOW_METHODS = 'POST, OPTIONS';

/** Normalised ALLOWED_ORIGINS entries; empty = allow any origin. */
export function parseAllowedOrigins(value: string | undefined | null): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/\/+$/, ''))
    .filter(Boolean);
}

/** True when `origin` equals an entry, or is a subdomain of a "*.domain" / "scheme://*.domain" entry. */
export function originAllowed(origin: string, allowed: string[]): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const normalised = `${url.protocol}//${url.host}`;
  return allowed.some((entry) => {
    if (entry === '*') return true;
    const wildcard = /^(?:([a-z][a-z0-9+.-]*):\/\/)?\*\.(.+)$/.exec(entry);
    if (!wildcard) return entry === normalised;
    const [, scheme = 'https', domain] = wildcard;
    return url.protocol === `${scheme}:` && url.host.endsWith(`.${domain}`);
  });
}

/** CORS headers for a request from `origin` (null when the request has no Origin header). */
export function corsHeadersFor(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Allow-Methods': ALLOW_METHODS,
  };
  if (allowed.length === 0) {
    headers['Access-Control-Allow-Origin'] = '*';
    return headers;
  }
  headers['Vary'] = 'Origin';
  if (origin && originAllowed(origin, allowed)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * Serves `handler` for POST requests. Answers CORS preflights, rejects other methods and
 * (when ALLOWED_ORIGINS is set) browser requests from other origins, adds CORS headers to
 * every response and turns unexpected errors into `{ error: 'internal_error' }` 500s.
 */
export function serve(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    const allowed = parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
    const origin = req.headers.get('origin');
    let res: Response;
    if (req.method === 'OPTIONS') {
      res = new Response('ok');
    } else if (origin && allowed.length > 0 && !originAllowed(origin, allowed)) {
      res = json({ error: 'origin_not_allowed' }, 403);
    } else if (req.method !== 'POST') {
      res = json({ error: 'method_not_allowed' }, 405);
    } else {
      try {
        res = await handler(req);
      } catch (err) {
        // Message only: never log request content (questions, photos).
        console.error('unhandled error', err instanceof Error ? err.message : String(err));
        res = json({ error: 'internal_error' }, 500);
      }
    }
    for (const [name, value] of Object.entries(corsHeadersFor(origin, allowed))) {
      res.headers.set(name, value);
    }
    return res;
  });
}

/**
 * Reads a JSON object body of at most `maxBytes`: rejects by Content-Length first, then
 * stops reading the stream as soon as it grows past the limit. Returns the parsed object,
 * or an error Response (413 payload_too_large / 400 invalid_json) to return as-is.
 */
export async function readJsonBody(
  req: Request,
  maxBytes: number,
): Promise<Record<string, unknown> | Response> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) {
    return json({ error: 'payload_too_large' }, 413);
  }
  if (!req.body) return json({ error: 'invalid_json' }, 400);

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return json({ error: 'payload_too_large' }, 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return json({ error: 'invalid_json' }, 400);
  }
  return parsed as Record<string, unknown>;
}

/** Best-effort client IP for rate limiting (set by Supabase's edge proxy). */
export function clientIp(req: Request): string {
  const first = (value: string | null) => value?.split(',')[0]?.trim() || null;
  return (
    first(req.headers.get('cf-connecting-ip')) ??
    first(req.headers.get('x-real-ip')) ??
    first(req.headers.get('x-forwarded-for')) ??
    'unknown'
  ).slice(0, 64);
}
