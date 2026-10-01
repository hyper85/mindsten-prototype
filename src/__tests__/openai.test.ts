import { describe, expect, it } from 'vitest';
import {
  readChatCompletion,
  stripThinking,
  toChatContent,
} from '../../supabase/functions/_shared/openai.ts';

describe('OpenAI-compatible chat helpers (OpenCode non-Claude models)', () => {
  it('turns base64 image blocks into data-URL image parts', () => {
    expect(
      toChatContent([
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } },
        { type: 'text', text: 'Læs stenen' },
      ]),
    ).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
      { type: 'text', text: 'Læs stenen' },
    ]);
    expect(toChatContent('Hej')).toBe('Hej');
  });

  it('reads the answer and drops inline thinking', () => {
    expect(stripThinking('<think>hmm</think>\n Svar')).toBe('Svar');
    expect(
      readChatCompletion({
        choices: [
          {
            message: { content: '<think>…</think>H.C. Andersen skrev eventyr.' },
            finish_reason: 'stop',
          },
        ],
      }),
    ).toEqual({ text: 'H.C. Andersen skrev eventyr.', refused: false, finishReason: 'stop' });
  });

  it('treats a content-filter stop as a refusal and rejects malformed responses', () => {
    expect(
      readChatCompletion({
        choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
      }).refused,
    ).toBe(true);
    expect(() => readChatCompletion({ error: 'nope' })).toThrow();
  });
});
