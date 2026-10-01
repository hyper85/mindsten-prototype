import { ArrowUp, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { NavBar } from '../components/Layout';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { askAboutPerson, AskError, getPersonById, type AskTurn } from '../lib/api';
import { genitive, suggestedQuestions } from '../lib/ask';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Person } from '../types';
import { useDocumentTitle } from '../lib/title';

interface ChatEntry extends AskTurn {
  error?: boolean;
}

const storageKey = (id: number) => `mindsten.ask.${id}`;

function loadConversation(id: number): ChatEntry[] {
  try {
    const raw = window.sessionStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as ChatEntry[]) : [];
  } catch {
    return [];
  }
}

function saveConversation(id: number, entries: ChatEntry[]): void {
  try {
    window.sessionStorage.setItem(storageKey(id), JSON.stringify(entries.slice(-20)));
  } catch {
    /* storage unavailable — ignore */
  }
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
  );
}

export function AskPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialQuestion = (location.state as { question?: string } | null)?.question;
  const [person, setPerson] = useState<Person | null | undefined>(undefined);
  useDocumentTitle(person ? `Spørg om ${person.name}` : 'Spørg om');
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const askedInitial = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getPersonById(Number(id))
      .then((p) => {
        if (cancelled) return;
        setPerson(p);
        if (p) setEntries(loadConversation(p.id));
      })
      .catch(() => !cancelled && setPerson(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [entries, busy]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!person || q.length < 2 || busy) return;
      const history: AskTurn[] = entries
        .filter((e) => !e.error)
        .map(({ role, content }) => ({ role, content }));
      const withQuestion: ChatEntry[] = [...entries, { role: 'user', content: q }];
      setEntries(withQuestion);
      setDraft('');
      setBusy(true);
      try {
        const answer = await askAboutPerson(person.id, q, history);
        const next: ChatEntry[] = [...withQuestion, { role: 'assistant', content: answer }];
        setEntries(next);
        saveConversation(person.id, next);
      } catch (err) {
        const message =
          err instanceof AskError ? err.message : 'Det lykkedes ikke at få et svar. Prøv igen.';
        setEntries([...withQuestion, { role: 'assistant', content: message, error: true }]);
      } finally {
        setBusy(false);
      }
    },
    [person, entries, busy],
  );

  // A question tapped on the person page arrives via navigation state.
  useEffect(() => {
    if (person && initialQuestion && !askedInitial.current) {
      askedInitial.current = true;
      navigate('.', { replace: true, state: null });
      void ask(initialQuestion);
    }
  }, [person, initialQuestion, ask, navigate]);

  if (person === undefined) {
    return (
      <>
        <NavBar />
        <LoadingState />
      </>
    );
  }
  if (person === null) {
    return (
      <>
        <NavBar />
        <EmptyState
          title="Person ikke fundet"
          actionLabel="Til forsiden"
          onAction={() => navigate('/home')}
        />
      </>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  const suggestions = suggestedQuestions(person);
  const empty = entries.length === 0;

  return (
    <div className="chat">
      <NavBar
        title={`Spørg om ${person.name}`}
        backLabel={person.name.length <= 16 ? person.name : 'Tilbage'}
        fallback={`/person/${person.id}`}
      />
      <div className="chat-body">
        <header className="chat-intro">
          <Avatar person={person} size={60} />
          <h1>Spørg om {person.name}</h1>
          <p>
            Stil et spørgsmål om {genitive(person.name)} liv og den tid, personen levede i.
            AI-guiden svarer ud fra biografien og historiske fakta.
          </p>
        </header>

        {empty && (
          <div className="suggestions" aria-label="Forslag til spørgsmål">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                className="suggestion"
                onClick={() => void ask(q)}
                disabled={busy}
              >
                <MessageCircleQuestion aria-hidden="true" />
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="messages" aria-live="polite">
          {entries.map((e, i) => (
            <div
              key={i}
              className={`bubble ${e.role === 'user' ? 'is-user' : e.error ? 'is-error' : 'is-ai'}`}
            >
              {e.role === 'assistant' && !e.error && (
                <span className="bubble-label">
                  <Sparkles aria-hidden="true" />
                  MindSTEN-guiden
                </span>
              )}
              <Paragraphs text={e.content} />
            </div>
          ))}
          {busy && (
            <div className="typing" role="status" aria-label="Guiden skriver">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>

        {!empty && !busy && (
          <div className="chips" aria-label="Flere spørgsmål">
            {suggestions
              .filter((q) => !entries.some((e) => e.role === 'user' && e.content === q))
              .map((q) => (
                <button key={q} type="button" className="chip" onClick={() => void ask(q)}>
                  {q}
                </button>
              ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={onSubmit}>
        <div className="composer-row">
          <textarea
            rows={1}
            value={draft}
            maxLength={500}
            placeholder={
              isSupabaseConfigured ? 'Stil et spørgsmål…' : 'AI-guiden er ikke koblet på endnu'
            }
            aria-label={`Spørg om ${person.name}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void ask(draft);
              }
            }}
          />
          <button
            type="submit"
            className="send-btn"
            aria-label="Send spørgsmål"
            disabled={busy || draft.trim().length < 2}
          >
            <ArrowUp aria-hidden="true" />
          </button>
        </div>
        <p className="composer-note">AI kan tage fejl – tjek gerne kilderne på personens side.</p>
      </form>
    </div>
  );
}
