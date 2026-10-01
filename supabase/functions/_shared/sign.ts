// Signed assistant turns for ask-person (Web Crypto only, no Deno APIs — runs in Vitest too).
//
// The function returns `sig` = base64url(HMAC-SHA256(key, `${personId}\n${answer}`)) with each
// answer; the client sends it back with that turn in `history`. Assistant turns without a
// valid signature are dropped, so clients can't put words in the guide's mouth.

const encoder = new TextEncoder();
const keys = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keys.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    keys.set(secret, key);
  }
  return key;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-time string comparison (time depends only on the length of `a`). */
function timingSafeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ (y[i] ?? 0);
  return diff === 0;
}

export async function signAnswer(
  secret: string,
  personId: number,
  answer: string,
): Promise<string> {
  const mac = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(`${personId}\n${answer}`),
  );
  return base64url(new Uint8Array(mac));
}

export async function verifyAnswer(
  secret: string,
  personId: number,
  answer: string,
  sig: unknown,
): Promise<boolean> {
  if (typeof sig !== 'string' || sig.length === 0 || sig.length > 128) return false;
  return timingSafeEqual(await signAnswer(secret, personId, answer), sig);
}
