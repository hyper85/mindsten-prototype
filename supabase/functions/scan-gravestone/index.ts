// POST { image: <base64 jpeg>, lat?: number, lng?: number }
// → { reading, candidates: [{ person_id, score, distance_m }] }
//
// Claude reads names and years off the gravestone photo; Postgres
// (match_gravestone) ranks persons by name similarity, years and distance.
// The photo is never stored.

import { adminClient, checkRateLimits, numberEnv } from '../_shared/clients.ts';
import { generateJson, LlmRateLimitError } from '../_shared/llm.ts';
import { clientIp, json, readJsonBody, serve } from '../_shared/http.ts';

// The client sends a ≤1280 px JPEG (typically 100–500 KB); anything much larger is refused
// before it reaches the model (Claude's limit is 5 MB per image).
const MAX_BODY_BYTES = 2_000_000;
const MAX_BASE64_CHARS = 1_950_000; // ≈ 1.4 MB decoded

const SYSTEM = `Du aflæser fotos af gravsten og mindesten, primært fra danske kirkegårde.
Returnér kun det, der faktisk står på stenen. Gæt ikke navne, og opfind ikke årstal.
Gamle sten kan være forvitrede eller skrevet med gotisk skrift; skriv navnene med moderne stavning,
hvis bogstaverne er tydelige (fx "Aa" bevares, men ligaturer opløses).
Hvis flere personer er begravet under samme sten, skal hver person have sin egen post.
Årstal: brug kun fire-cifrede år, der tydeligt hører til personen (født/død, *, †).
Sæt is_gravestone=false, hvis billedet ikke viser en grav-/mindesten eller et gravskilt.`;

const READING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_gravestone', 'people', 'inscription'],
  properties: {
    is_gravestone: { type: 'boolean' },
    people: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'birth_year', 'death_year'],
        properties: {
          name: { type: 'string' },
          birth_year: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          death_year: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
        },
      },
    },
    inscription: {
      type: 'string',
      description: 'Den øvrige tekst på stenen, fx titel eller gravvers.',
    },
  },
} as const;

interface MatchRow {
  person_id: number;
  score: number;
  distance_m: number | null;
}

/** Integer year in 800–2100 (numbers or numeric strings from the model), else null. */
function validYear(y: unknown): number | null {
  const n = typeof y === 'string' && /^\s*\d{3,4}\s*$/.test(y) ? Number(y) : y;
  return typeof n === 'number' && Number.isInteger(n) && n >= 800 && n <= 2100 ? n : null;
}

function validCoord(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

const MEDIA_TYPES: Array<
  [prefix: string, type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif']
> = [
  ['/9j/', 'image/jpeg'],
  ['iVBORw0KGgo', 'image/png'],
  ['UklGR', 'image/webp'],
  ['R0lGOD', 'image/gif'],
];

serve(async (req) => {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  const image =
    typeof body.image === 'string'
      ? body.image.replace(/^data:image\/[\w.+-]+;base64,/, '').replace(/\s+/g, '')
      : '';
  if (image.length > MAX_BASE64_CHARS) return json({ error: 'image_too_large' }, 413);
  const mediaType = MEDIA_TYPES.find(([prefix]) => image.startsWith(prefix))?.[1];
  if (!image || !mediaType || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return json({ error: 'invalid_image' }, 400);
  }
  const lat = validCoord(body.lat, 90);
  const lng = validCoord(body.lng, 180);

  const sb = adminClient();
  const allowed = await checkRateLimits(
    sb,
    'scan',
    clientIp(req),
    numberEnv('SCAN_LIMIT_PER_HOUR', 40),
    numberEnv('SCAN_LIMIT_PER_DAY', 3000),
  );
  if (!allowed) return json({ error: 'rate_limited' }, 429);

  let reading: Record<string, unknown>;
  try {
    const result = await generateJson<unknown>({
      system: SYSTEM,
      schema: READING_SCHEMA,
      effort: 'low',
      maxTokens: 4000,
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        { type: 'text', text: 'Aflæs denne gravsten.' },
      ],
    });
    if (!result) return json({ reading: null, candidates: [] });
    if (typeof result !== 'object' || Array.isArray(result)) {
      throw new Error('reading does not match schema');
    }
    reading = result as Record<string, unknown>;
  } catch (err) {
    if (err instanceof LlmRateLimitError) return json({ error: 'rate_limited' }, 429);
    console.error('vision call failed', err instanceof Error ? err.message : String(err));
    return json({ error: 'vision_failed' }, 502);
  }

  const rawPeople: unknown[] = Array.isArray(reading.people) ? reading.people : [];
  const people = rawPeople
    .filter(
      (p): p is Record<string, unknown> =>
        !!p && typeof p === 'object' && typeof (p as { name?: unknown }).name === 'string',
    )
    .map((p) => ({
      name: (p.name as string).trim().slice(0, 200),
      birthYear: validYear(p.birth_year),
      deathYear: validYear(p.death_year),
    }))
    .filter((p) => p.name.length >= 2)
    .slice(0, 4);
  const isGravestone = reading.is_gravestone === true;

  const best = new Map<number, MatchRow>();
  if (isGravestone) {
    for (const p of people) {
      const { data, error } = await sb.rpc('match_gravestone', {
        p_names: [p.name],
        p_birth_year: p.birthYear,
        p_death_year: p.deathYear,
        p_lat: lat,
        p_lng: lng,
        p_limit: 5,
      });
      if (error) {
        console.error('match_gravestone failed', error.message);
        continue;
      }
      for (const row of (data ?? []) as MatchRow[]) {
        const prev = best.get(row.person_id);
        if (!prev || row.score > prev.score) best.set(row.person_id, row);
      }
    }
  }

  const candidates = [...best.values()]
    .filter((c) => c.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return json({
    reading: {
      isGravestone,
      people,
      inscription:
        typeof reading.inscription === 'string' ? reading.inscription.slice(0, 1000) : '',
    },
    candidates,
  });
});
