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

/**
 * Collects a streamed /v1/chat/completions response (server-sent events). Text can arrive
 * split anywhere, so incomplete lines are kept until the rest comes in. Counts reasoning
 * text separately (`delta.reasoning_content`) so logs can show whether a model was still
 * thinking when it ran out of time.
 */
export class ChatStreamAccumulator {
  content = '';
  reasoningChars = 0;
  finishReason = '';
  done = false;
  private buffer = '';

  push(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';
    for (const line of lines) this.line(line);
  }

  /** Call when the stream ends, to process a last line without a newline. */
  end(): void {
    if (this.buffer) this.line(this.buffer);
    this.buffer = '';
  }

  private line(line: string): void {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data) return;
    if (data === '[DONE]') {
      this.done = true;
      return;
    }
    let event: { choices?: Array<Record<string, unknown>> };
    try {
      event = JSON.parse(data);
    } catch {
      return; // keep-alive or malformed event
    }
    const choice = event.choices?.[0];
    if (!choice) return;
    const delta = (choice.delta ?? {}) as { content?: unknown; reasoning_content?: unknown };
    if (typeof delta.content === 'string') this.content += delta.content;
    if (typeof delta.reasoning_content === 'string') {
      this.reasoningChars += delta.reasoning_content.length;
    }
    if (typeof choice.finish_reason === 'string' && choice.finish_reason) {
      this.finishReason = choice.finish_reason;
    }
  }

  result(): { text: string; refused: boolean; finishReason: string } {
    return {
      text: stripThinking(this.content),
      refused: this.finishReason === 'content_filter',
      finishReason: this.finishReason,
    };
  }
}
