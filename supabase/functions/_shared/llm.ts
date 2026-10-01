// One place that talks to the language model, so the Edge Functions work with
// either provider:
//
//   ANTHROPIC_API_KEY  → Claude API directly (structured outputs, fallbacks)
//   OPENCODE_API_KEY   → OpenCode Zen gateway (Anthropic-compatible /v1/messages);
//                        JSON is requested in the prompt and parsed leniently.
//
// Optional secrets: LLM_MODEL (model id for the chosen provider),
// LLM_BASE_URL (override the OpenCode gateway URL).

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import { extractJsonObject } from './json.ts';

const OPENCODE_BASE_URL = 'https://opencode.ai/zen';
const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';
// Must be a Claude model in the OpenCode Zen catalogue (served on /v1/messages).
const DEFAULT_OPENCODE_MODEL = 'claude-sonnet-4-5';

export type Provider = 'anthropic' | 'opencode';

interface LlmConfig {
  provider: Provider;
  model: string;
  client: Anthropic;
}

export class LlmRateLimitError extends Error {}

function config(): LlmConfig {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const opencodeKey = Deno.env.get('OPENCODE_API_KEY');
  const model = Deno.env.get('LLM_MODEL') ?? Deno.env.get('ANTHROPIC_MODEL');
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      model: model ?? DEFAULT_ANTHROPIC_MODEL,
      client: new Anthropic({ apiKey: anthropicKey, maxRetries: 1 }),
    };
  }
  if (opencodeKey) {
    return {
      provider: 'opencode',
      model: model ?? DEFAULT_OPENCODE_MODEL,
      client: new Anthropic({
        apiKey: opencodeKey,
        baseURL: Deno.env.get('LLM_BASE_URL') ?? OPENCODE_BASE_URL,
        defaultHeaders: { Authorization: `Bearer ${opencodeKey}` },
        maxRetries: 1,
      }),
    };
  }
  throw new Error('No model API key: set the ANTHROPIC_API_KEY or OPENCODE_API_KEY secret');
}

export function modelName(): string {
  try {
    return config().model;
  } catch {
    return 'unconfigured';
  }
}

interface JsonRequest {
  system: string;
  content: Anthropic.ContentBlockParam[] | string;
  schema: Record<string, unknown>;
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
}

/**
 * Asks the model for a JSON object matching `schema`.
 * Returns null when the model declines (refusal); throws on other failures.
 */
export async function generateJson<T>(req: JsonRequest): Promise<T | null> {
  const { provider, model, client } = config();
  try {
    if (provider === 'anthropic') {
      const response = await client.beta.messages.create({
        model,
        max_tokens: req.maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: req.system,
        output_config: { effort: req.effort, format: { type: 'json_schema', schema: req.schema } },
        messages: [{ role: 'user', content: req.content }],
      });
      if (response.stop_reason === 'refusal') return null;
      const text = response.content.find((b) => b.type === 'text');
      if (!text || text.type !== 'text') throw new Error('no text block in response');
      return JSON.parse(text.text) as T;
    }

    // OpenCode gateway: plain Messages API, no beta features. Ask for JSON in the prompt.
    const response = await client.messages.create({
      model,
      max_tokens: req.maxTokens,
      system:
        `${req.system}\n\nSvar udelukkende med ét gyldigt JSON-objekt — ingen anden tekst, ingen ` +
        `markdown. Objektet skal følge dette JSON-skema:\n${JSON.stringify(req.schema)}`,
      messages: [{ role: 'user', content: req.content }],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return extractJsonObject(text) as T;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new LlmRateLimitError(String(err));
    throw err;
  }
}
