// POST { personId: number, question: string, history?: [{ role, content }] }
// → { answer: string, model: string, cached?: boolean }
//
// The "Spørg om personen" guide: answers visitors' questions grounded in the
// person's stored biography, timeline, sources and the curated era facts.
// First questions without history are cached per person (the suggested
// questions are asked a lot). Questions are not logged or stored otherwise.

import {
  ASK_SYSTEM,
  buildPersonContext,
  MAX_QUESTION_CHARS,
  questionKey,
  sanitizeHistory,
  type AskPerson,
} from '../_shared/ask.ts';
import { adminClient, numberEnv, withinRateLimit } from '../_shared/clients.ts';
import { clientIp, corsHeaders, json } from '../_shared/http.ts';
import { generateText, LlmRateLimitError, modelName } from '../_shared/llm.ts';

const REFUSAL_ANSWER =
  'Det kan jeg desværre ikke svare på. Prøv at spørge om personens liv, værk eller den tid, de levede i.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const personId = Number(body?.personId);
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!Number.isSafeInteger(personId) || personId <= 0)
    return json({ error: 'invalid_person' }, 400);
  if (question.length < 2 || question.length > MAX_QUESTION_CHARS) {
    return json({ error: 'invalid_question' }, 400);
  }
  const history = sanitizeHistory(body?.history);

  const sb = adminClient();
  const key = history.length === 0 ? questionKey(question) : null;
  if (key) {
    const cached = await sb
      .from('person_answers')
      .select('answer, model')
      .eq('person_id', personId)
      .eq('question_key', key)
      .maybeSingle();
    if (cached.data)
      return json({ answer: cached.data.answer, model: cached.data.model, cached: true });
  }

  const ip = clientIp(req);
  const perIp = await withinRateLimit(sb, `ask:${ip}`, numberEnv('ASK_LIMIT_PER_HOUR', 30), 3600);
  const global = await withinRateLimit(
    sb,
    'ask:global',
    numberEnv('ASK_LIMIT_PER_DAY', 3000),
    86400,
  );
  if (!perIp || !global) return json({ error: 'rate_limited' }, 429);

  const { data: person, error } = await sb
    .from('persons')
    .select(
      'name, born, died, birth_year, death_year, birth_place, death_place, profession, cemetery, city, short_bio, full_bio, timeline_events(year, event, sort_order), person_sources(label, url, sort_order)',
    )
    .eq('id', personId)
    .maybeSingle();
  if (error || !person) return json({ error: 'not_found' }, 404);

  const byOrder = (a: { sort_order: number }, b: { sort_order: number }) =>
    a.sort_order - b.sort_order;
  const askPerson: AskPerson = {
    ...person,
    timeline: [...(person.timeline_events ?? [])]
      .sort(byOrder)
      .map(({ year, event }) => ({ year, event })),
    sources: [...(person.person_sources ?? [])]
      .sort(byOrder)
      .map(({ label, url }) => ({ label, url })),
  };

  let answer: string | null;
  try {
    answer = await generateText({
      system: `${ASK_SYSTEM}\n\n${buildPersonContext(askPerson)}`,
      messages: [...history, { role: 'user', content: question }],
      effort: 'low',
      maxTokens: 2000,
    });
  } catch (err) {
    if (err instanceof LlmRateLimitError) return json({ error: 'rate_limited' }, 429);
    console.error('ask-person generation failed', err instanceof Error ? err.message : err);
    return json({ error: 'generation_failed' }, 502);
  }

  const model = modelName();
  if (!answer) return json({ answer: REFUSAL_ANSWER, model, refused: true });

  if (key) {
    const { error: cacheError } = await sb
      .from('person_answers')
      .upsert({ person_id: personId, question_key: key, answer, model });
    if (cacheError) console.error('caching answer failed', cacheError.message);
  }
  return json({ answer, model });
});
