// POST { image: <base64 jpeg>, lat?: number, lng?: number }
// → { reading, candidates: [{ person_id, score, distance_m }] }
//
// Claude reads names and years off the gravestone photo; Postgres
// (match_gravestone) ranks persons by name similarity, years and distance.
// The photo is never stored.

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import {
  adminClient,
  anthropicClient,
  MODEL,
  numberEnv,
  withinRateLimit,
} from '../_shared/clients.ts';
import { clientIp, corsHeaders, json } from '../_shared/http.ts';

const MAX_BASE64_CHARS = 7_000_000; // ≈ 5 MB image

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

interface RawReading {
  is_gravestone: boolean;
  people: Array<{ name: string; birth_year: number | null; death_year: number | null }>;
  inscription: string;
}

interface MatchRow {
  person_id: number;
  score: number;
  distance_m: number | null;
}

function validYear(y: unknown): number | null {
  return typeof y === 'number' && Number.isInteger(y) && y >= 800 && y <= 2100 ? y : null;
}

function validCoord(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const image =
    typeof body?.image === 'string' ? body.image.replace(/^data:image\/\w+;base64,/, '') : '';
  if (
    !image ||
    image.length > MAX_BASE64_CHARS ||
    !/^[A-Za-z0-9+/=\s]+$/.test(image.slice(0, 200))
  ) {
    return json({ error: 'invalid_image' }, 400);
  }
  const lat = validCoord(body?.lat, 90);
  const lng = validCoord(body?.lng, 180);

  const sb = adminClient();
  const ip = clientIp(req);
  const perIp = await withinRateLimit(sb, `scan:${ip}`, numberEnv('SCAN_LIMIT_PER_HOUR', 40), 3600);
  const global = await withinRateLimit(
    sb,
    'scan:global',
    numberEnv('SCAN_LIMIT_PER_DAY', 3000),
    86400,
  );
  if (!perIp || !global) return json({ error: 'rate_limited' }, 429);

  let reading: RawReading;
  try {
    const client = anthropicClient();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: READING_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'Aflæs denne gravsten.' },
          ],
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json({ reading: null, candidates: [] });
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('no text block in response');
    reading = JSON.parse(text.text) as RawReading;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    console.error('vision call failed', err);
    return json({ error: 'vision_failed' }, 502);
  }

  const people = (reading.people ?? [])
    .filter((p) => typeof p.name === 'string' && p.name.trim().length >= 2)
    .slice(0, 4)
    .map((p) => ({
      name: p.name.trim(),
      birthYear: validYear(p.birth_year),
      deathYear: validYear(p.death_year),
    }));

  const best = new Map<number, MatchRow>();
  if (reading.is_gravestone) {
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
        console.error('match_gravestone failed', error);
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
      isGravestone: Boolean(reading.is_gravestone),
      people,
      inscription: String(reading.inscription ?? '').slice(0, 1000),
    },
    candidates,
  });
});
