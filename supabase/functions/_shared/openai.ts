// Pure helpers (no Deno APIs, unit-tested with Vitest) for OpenAI-compatible
// /v1/chat/completions — how the OpenCode Zen gateway serves non-Claude models (GLM, Kimi, Qwen …).

/** The Anthropic-style blocks the Edge Functions build (text and base64 images). */
export type InputBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

/** Anthropic content (string or blocks) → OpenAI chat content. */
export function toChatContent(content: string | InputBlock[]): string | ChatContentPart[] {
  if (typeof content === 'string') return content;
  return content.map(
    (block): ChatContentPart =>
      block.type === 'text'
        ? { type: 'text', text: block.text }
        : {
            type: 'image_url',
            image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
          },
  );
}

/** Some reasoning models put their thinking inline; only the answer after it is wanted. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Reads a /v1/chat/completions response. `refused` is true when the provider's content
 * filter stopped the answer (the equivalent of Claude's `refusal` stop reason).
 */
export function readChatCompletion(body: unknown): {
  text: string;
  refused: boolean;
  finishReason: string;
} {
  const choice = (body as { choices?: Array<Record<string, unknown>> })?.choices?.[0];
  if (!choice) throw new Error('no choices in model response');
  const message = choice.message as { content?: unknown } | undefined;
  const raw = message?.content;
  const text =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw.map((p) => (p && typeof p === 'object' && 'text' in p ? String(p.text) : '')).join('')
        : '';
  const finishReason = String(choice.finish_reason ?? '');
  return { text: stripThinking(text), refused: finishReason === 'content_filter', finishReason };
}
