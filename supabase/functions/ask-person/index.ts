// POST { personId: number, question: string, history?: [{ role, content, sig? }] }
// → { answer: string, model: string, sig: string, cached?: boolean, refused?: boolean }
//
// The "Spørg om personen" guide: answers visitors' questions grounded in the
// person's stored biography, timeline, sources and the curated era facts.
// First questions without history are cached per person (the suggested
// questions are asked a lot). Questions are not logged or stored otherwise.
//
// Every answer comes with `sig` (HMAC over personId + answer, see _shared/sign.ts). Clients
// send it back on that assistant turn in `history`; assistant turns without a valid sig are
// dropped together with the question before them.

import {
  ASK_SYSTEM,
  buildPersonContext,
  MAX_QUESTION_CHARS,
  parseHistory,
  questionKey,
  sanitizeHistory,
  type AskPerson,
} from '../_shared/ask.ts';
import { adminClient, askSigningKey, checkRateLimits, numberEnv } from '../_shared/clients.ts';
import { clientIp, json, readJsonBody, serve } from '../_shared/http.ts';
import { generateText, LlmRateLimitError, modelName } from '../_shared/llm.ts';
import { signAnswer, verifyAnswer } from '../_shared/sign.ts';

const MAX_BODY_BYTES = 32_768;

const REFUSAL_ANSWER =
  'Det kan jeg desværre ikke svare på. Prøv at spørge om personens liv, værk eller den tid, de levede i.';

serve(async (req) => {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  const personId = Number(body.personId);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!Number.isSafeInteger(personId) || personId <= 0)
    return json({ error: 'invalid_person' }, 400);
  if (question.length < 2 || question.length > MAX_QUESTION_CHARS) {
    return json({ error: 'invalid_question' }, 400);
  }

  const secret = askSigningKey();
  const items = parseHistory(body.history);
  const genuine = await Promise.all(
    items.map((m) =>
      m.role === 'assistant' ? verifyAnswer(secret, personId, m.content, m.sig) : false,
    ),
  );
  const history = sanitizeHistory(items, (_m, i) => genuine[i]);
  const respond = async (answer: string, model: string | null, extra: object = {}) =>
    json({ answer, model, sig: await signAnswer(secret, personId, answer), ...extra });

  const sb = adminClient();

  // Cache hits and unknown persons cost no rate-limit budget.
  const key = history.length === 0 ? questionKey(question) : null;
  if (key) {
    const cached = await sb
      .from('person_answers')
      .select('answer, model')
      .eq('person_id', personId)
      .eq('question_key', key)
      .maybeSingle();
    if (cached.data) return respond(cached.data.answer, cached.data.model, { cached: true });
  }

  const { data: person, error } = await sb
    .from('persons')
    .select(
      'name, born, died, birth_year, death_year, birth_place, death_place, profession, cemetery, city, short_bio, full_bio, timeline_events(year, event, sort_order), person_sources(label, url, sort_order)',
    )
    .eq('id', personId)
    .maybeSingle();
  if (error) throw new Error(`person lookup failed: ${error.message}`);
  if (!person) return json({ error: 'not_found' }, 404);

  const allowed = await checkRateLimits(
    sb,
    'ask',
    clientIp(req),
    numberEnv('ASK_LIMIT_PER_HOUR', 30),
    numberEnv('ASK_LIMIT_PER_DAY', 3000),
  );
  if (!allowed) return json({ error: 'rate_limited' }, 429);

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
      // Room for reasoning models' thinking; answers themselves stay short (prompt: ~120 words).
      maxTokens: 4000,
    });
  } catch (err) {
    if (err instanceof LlmRateLimitError) return json({ error: 'rate_limited' }, 429);
    console.error('ask-person generation failed', err instanceof Error ? err.message : err);
    return json({ error: 'generation_failed' }, 502);
  }

  const model = modelName();
  if (!answer) return respond(REFUSAL_ANSWER, model, { refused: true });

  if (key) {
    const { error: cacheError } = await sb
      .from('person_answers')
      .upsert({ person_id: personId, question_key: key, answer, model });
    if (cacheError) console.error('caching answer failed', cacheError.message);
  }
  return respond(answer, model);
});
