// One place that talks to the language model, so the Edge Functions work with
// either provider:
//
//   ANTHROPIC_API_KEY  → Claude API directly (structured outputs, fallbacks)
//   OPENCODE_API_KEY   → OpenCode Zen gateway: Claude models (`claude-*`) on the
//                        Anthropic-compatible /v1/messages, every other model (GLM, Kimi,
//                        Qwen …) on the OpenAI-compatible /v1/chat/completions.
//                        JSON is requested in the prompt and parsed leniently.
//
// Optional secrets: LLM_MODEL (model id for the chosen provider), LLM_VISION_MODEL (model
// for reading gravestone photos, if LLM_MODEL can't see images), LLM_BASE_URL (override
// the OpenCode gateway URL), LLM_EXTRA_BODY (JSON merged into /v1/chat/completions
// requests, e.g. {"thinking":{"type":"disabled"}} to switch off a model's reasoning).

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import { extractJsonObject } from './json.ts';
import {
  ChatStreamAccumulator,
  readChatCompletion,
  toChatContent,
  type ChatCompletionMessage,
  type InputBlock,
} from './openai.ts';

const OPENCODE_BASE_URL = 'https://opencode.ai/zen';
const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';
// The owner's OpenCode Zen model (served on /v1/chat/completions); override with LLM_MODEL.
const DEFAULT_OPENCODE_MODEL = 'glm-5.3-flash';
const TIMEOUT_MS = 50_000;
// OpenCode chat models (e.g. GLM) can be slow to write a long story. Supabase drops a request
// that sends no response for 150 s, so finish (or give up) well before that.
const CHAT_TIMEOUT_MS = 110_000;
// Edge Functions have a limited wall-clock budget: fail a hung request instead of
// waiting for the SDK's 10-minute default, and retry at most once.
const CLIENT_OPTIONS = { timeout: TIMEOUT_MS, maxRetries: 1 } as const;

export type Provider = 'anthropic' | 'opencode';

interface LlmConfig {
  provider: Provider;
  model: string;
  visionModel: string;
  apiKey: string;
  baseURL: string;
  client: Anthropic;
}

export class LlmRateLimitError extends Error {}

function config(): LlmConfig {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const opencodeKey = Deno.env.get('OPENCODE_API_KEY');
  const model = (Deno.env.get('LLM_MODEL') || Deno.env.get('ANTHROPIC_MODEL'))?.trim();
  const visionModel = Deno.env.get('LLM_VISION_MODEL')?.trim();
  if (anthropicKey) {
    const chosen = model || DEFAULT_ANTHROPIC_MODEL;
    return {
      provider: 'anthropic',
      model: chosen,
      visionModel: visionModel || chosen,
      apiKey: anthropicKey,
      baseURL: 'https://api.anthropic.com',
      client: new Anthropic({ apiKey: anthropicKey, ...CLIENT_OPTIONS }),
    };
  }
  if (opencodeKey) {
    const chosen = model || DEFAULT_OPENCODE_MODEL;
    const baseURL = (Deno.env.get('LLM_BASE_URL') || OPENCODE_BASE_URL).replace(/\/+$/, '');
    return {
      provider: 'opencode',
      model: chosen,
      visionModel: visionModel || chosen,
      apiKey: opencodeKey,
      baseURL,
      client: new Anthropic({
        apiKey: opencodeKey,
        baseURL,
        defaultHeaders: { Authorization: `Bearer ${opencodeKey}` },
        ...CLIENT_OPTIONS,
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

/** OpenCode serves Claude models on /v1/messages and all others on /v1/chat/completions. */
function usesChatCompletions(cfg: LlmConfig, model: string): boolean {
  return cfg.provider === 'opencode' && !model.toLowerCase().startsWith('claude-');
}

function extraBody(): Record<string, unknown> {
  const raw = Deno.env.get('LLM_EXTRA_BODY');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.error('LLM_EXTRA_BODY is not valid JSON — ignored');
    return {};
  }
}

async function chatCompletion(
  cfg: LlmConfig,
  model: string,
  messages: ChatCompletionMessage[],
  maxTokens: number,
): Promise<{ text: string; refused: boolean }> {
  // One overall budget that ends well inside the Edge Function's limits (and the app's
  // wait). The answer is streamed, so a slow model is logged with how far it got.
  const started = Date.now();
  const deadline = started + CHAT_TIMEOUT_MS;
  const body = JSON.stringify({
    ...extraBody(),
    model,
    max_tokens: maxTokens,
    messages,
    stream: true,
  });
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    const acc = new ChatStreamAccumulator();
    try {
      let res: Response;
      try {
        res = await fetch(`${cfg.baseURL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'text/event-stream',
            authorization: `Bearer ${cfg.apiKey}`,
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw timeoutError(model, started, acc);
        lastError = err; // network error before any answer: retry once
        continue;
      }
      if (res.status === 429) throw new LlmRateLimitError(await res.text());
      if (res.status >= 500 && attempt === 0) {
        lastError = new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);

      let result: { text: string; refused: boolean; finishReason: string };
      try {
        if (!(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
          // The gateway ignored `stream`: a plain JSON completion.
          result = readChatCompletion(await res.json());
        } else {
          const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
          while (!acc.done) {
            const { value, done } = await reader.read();
            if (done) break;
            acc.push(value);
          }
          acc.end();
          reader.cancel().catch(() => undefined);
          result = acc.result();
        }
      } catch (err) {
        if (controller.signal.aborted) throw timeoutError(model, started, acc);
        throw err;
      }
      console.log(
        `llm ${model}: ${Date.now() - started} ms, ${result.text.length} chars, ` +
          `${acc.reasoningChars} reasoning chars, finish ${result.finishReason || 'none'}`,
      );
      // An empty answer (e.g. the token budget spent on reasoning) is a failure, not a refusal.
      if (!result.text && !result.refused) {
        throw new Error(`empty model reply (finish_reason: ${result.finishReason || 'none'})`);
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function timeoutError(model: string, started: number, acc: ChatStreamAccumulator): Error {
  return new Error(
    `model did not finish within ${Math.round((Date.now() - started) / 1000)} s (${model}; ` +
      `${acc.content.length} answer chars, ${acc.reasoningChars} reasoning chars so far)`,
  );
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
  const cfg = config();
  const { provider, client } = cfg;
  const hasImage = Array.isArray(req.content) && req.content.some((b) => b.type === 'image');
  const model = hasImage ? cfg.visionModel : cfg.model;
  const jsonInstruction =
    `\n\nSvar udelukkende med ét gyldigt JSON-objekt — ingen anden tekst, ingen ` +
    `markdown. Objektet skal følge dette JSON-skema:\n${JSON.stringify(req.schema)}`;
  try {
    if (usesChatCompletions(cfg, model)) {
      const { text, refused } = await chatCompletion(
        cfg,
        model,
        [
          { role: 'system', content: req.system + jsonInstruction },
          { role: 'user', content: toChatContent(req.content as string | InputBlock[]) },
        ],
        req.maxTokens,
      );
      if (refused) return null;
      return extractJsonObject(text) as T;
    }

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
      system: req.system + jsonInstruction,
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TextRequest {
  system: string;
  messages: ChatMessage[];
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
}

/**
 * Plain-text chat completion. Returns null when the model declines (refusal);
 * throws LlmRateLimitError on 429 and the SDK error on other failures.
 */
export async function generateText(req: TextRequest): Promise<string | null> {
  const cfg = config();
  const { provider, model, client } = cfg;
  try {
    if (usesChatCompletions(cfg, model)) {
      const { text, refused } = await chatCompletion(
        cfg,
        model,
        [{ role: 'system', content: req.system }, ...req.messages],
        req.maxTokens,
      );
      return refused ? null : text;
    }

    if (provider === 'anthropic') {
      const response = await client.beta.messages.create({
        model,
        max_tokens: req.maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: req.system,
        output_config: { effort: req.effort },
        messages: req.messages,
      });
      if (response.stop_reason === 'refusal') return null;
      return response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
    }

    const response = await client.messages.create({
      model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
    });
    if (response.stop_reason === 'refusal') return null;
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new LlmRateLimitError(String(err));
    throw err;
  }
}
