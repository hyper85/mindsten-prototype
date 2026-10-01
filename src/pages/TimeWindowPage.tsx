import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildEraSnapshot } from '../../supabase/functions/_shared/era.ts';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getEraStory, getPersonById } from '../lib/api';
import { formatNumber } from '../lib/format';
import { recordTimeWindow } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import type { EraStory, Person } from '../types';

type StoryState = 'idle' | 'loading' | 'ok' | 'failed';

export function TimeWindowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not-found'>('loading');
  const [story, setStory] = useState<EraStory | null>(null);
  const [storyState, setStoryState] = useState<StoryState>('idle');
  const [scope, setScope] = useState<'dk' | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    getPersonById(Number(id))
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setPerson(result);
          recordTimeWindow(result.id);
          setStatus('ok');
        } else {
          setStatus('not-found');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const snapshot = useMemo(() => {
    if (!person) return null;
    const from = person.birthYear ?? (person.deathYear ? person.deathYear - 60 : null);
    const to = person.deathYear ?? (person.birthYear ? person.birthYear + 60 : null);
    return from !== null && to !== null ? buildEraSnapshot(from, to) : null;
  }, [person]);

  const loadStory = async () => {
    if (!person) return;
    setStoryState('loading');
    const result = await getEraStory(person.id);
    setStory(result);
    setStoryState(result ? 'ok' : 'failed');
  };

  if (status === 'loading') {
    return (
      <div className="tw-screen">
        <LoadingState />
      </div>
    );
  }

  if (!person || !snapshot) {
    return (
      <div className="tw-screen">
        <EmptyState
          title="Tidsvindue ikke tilgængeligt"
          description="Vi mangler årstal for personen."
          actionLabel="Tilbage"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  const events = snapshot.events.filter((e) => scope === 'all' || e.scope === 'dk');
  const { populationAtBirth: popBirth, populationAtDeath: popDeath } = snapshot;

  return (
    <div className="tw-screen">
      <PageHeader title="Tidsvindue" fallback={`/person/${person.id}`} />

      <div className="tw-hero">
        <div className="tw-era-badge">
          {snapshot.birthYear}–{snapshot.deathYear} · {snapshot.period.name}
        </div>
        <div className="tw-hero-name">{person.name}</div>
        <div className="tw-hero-title">{person.timeWindowTitle}</div>
        <div className="lifebar" aria-hidden="true">
          {snapshot.periods.map((p) => {
            const from = Math.max(p.from, snapshot.birthYear);
            const to = Math.min(p.to, snapshot.deathYear);
            const width = snapshot.lifespan > 0 ? ((to - from) / snapshot.lifespan) * 100 : 100;
            return (
              <div
                key={p.id}
                className="lifebar-seg"
                style={{ width: `${Math.max(width, 4)}%` }}
                title={p.name}
              >
                <span>{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tw-content">
        <div className="tw-context-card tw-summary">
          <div className="tw-cc-label">{snapshot.period.name}</div>
          <div className="tw-cc-text">{snapshot.period.summary}</div>
        </div>

        {/* AI narrative */}
        <div className="story-block">
          {storyState === 'ok' && story ? (
            <article className="story">
              <h2 className="tw-content-title">{story.title}</h2>
              <p className="story-intro">{story.intro}</p>
              {story.sections.map((s) => (
                <section key={s.heading}>
                  <h3>{s.heading}</h3>
                  <p>{s.body}</p>
                </section>
              ))}
              <blockquote className="story-imagine">{story.imagine}</blockquote>
              <p className="ai-note">
                Fortalt af AI ud fra kuraterede historiske fakta og personens biografi. Kan
                indeholde fejl — tjek kilderne.
              </p>
            </article>
          ) : isSupabaseConfigured ? (
            <button
              type="button"
              className="story-cta"
              onClick={loadStory}
              disabled={storyState === 'loading'}
            >
              <span className="tw-play-circle">
                {storyState === 'loading' ? <span className="mini-spinner" /> : Icons.sparkle}
              </span>
              <span>
                <strong>
                  {storyState === 'loading' ? 'Skriver fortællingen…' : 'Fortæl mig om tiden'}
                </strong>
                <br />
                <span className="muted">
                  {storyState === 'failed'
                    ? 'Det lykkedes ikke. Prøv igen om lidt.'
                    : 'En kort fortælling om livet i Danmark dengang'}
                </span>
              </span>
            </button>
          ) : null}
        </div>

        {snapshot.monarchs.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 20 }}>
              {snapshot.monarchs.length === 1
                ? 'Regent i levetiden'
                : `${snapshot.monarchs.length} regenter i levetiden`}
            </div>
            <div className="chip-row">
              {snapshot.monarchs.map((m) => (
                <span key={`${m.name}-${m.from}`} className="chip">
                  👑 {m.name}{' '}
                  <span className="muted">
                    {m.from}–{m.to ?? 'nu'}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}

        {(popBirth || popDeath) && (
          <div className="stat-grid" style={{ marginTop: 20 }}>
            {popBirth && (
              <div className="stat-item">
                <div className="stat-num">
                  {formatNumber(Math.round(popBirth.denmark / 1000) * 1000)}
                </div>
                <div className="stat-label">Danskere i {snapshot.birthYear}</div>
              </div>
            )}
            {popDeath && (
              <div className="stat-item">
                <div className="stat-num">
                  {formatNumber(Math.round(popDeath.denmark / 1000) * 1000)}
                </div>
                <div className="stat-label">Danskere i {snapshot.deathYear}</div>
              </div>
            )}
            {popBirth?.lifeExpectancy && (
              <div className="stat-item">
                <div className="stat-num">{popBirth.lifeExpectancy} år</div>
                <div className="stat-label">Forventet levealder</div>
              </div>
            )}
          </div>
        )}
        {(popBirth || popDeath) && (
          <div className="fine-print">Befolkningstal er afrundede skøn (ca.).</div>
        )}

        <div className="section-label" style={{ marginTop: 20 }}>
          Mens {person.name} levede
        </div>
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'all'}
            className={scope === 'all' ? 'active' : ''}
            onClick={() => setScope('all')}
          >
            Danmark & verden
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === 'dk'}
            className={scope === 'dk' ? 'active' : ''}
            onClick={() => setScope('dk')}
          >
            Kun Danmark
          </button>
        </div>
        {events.length === 0 ? (
          <div className="inline-note">Ingen registrerede begivenheder i perioden endnu.</div>
        ) : (
          <div className="timeline-section" style={{ padding: 0 }}>
            {events.map((e) => (
              <div key={`${e.year}-${e.title}`} className="timeline-item">
                <div className={`timeline-dot ${e.scope === 'world' ? 'world' : ''}`} />
                <div className="timeline-year">{e.year}</div>
                <div className="timeline-event">
                  <div>
                    {e.title} <span className="age-tag">{e.age} år</span>
                  </div>
                  {e.detail && <div className="timeline-detail">{e.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="section-label" style={{ marginTop: 12 }}>
          Hverdagen
        </div>
        <div className="tw-context-cards">
          {snapshot.periods.map((p) => (
            <div key={p.id} className="tw-context-card">
              <div className="tw-cc-label">
                {p.name} · {Math.max(p.from, snapshot.birthYear)}–
                {Math.min(p.to, snapshot.deathYear)}
              </div>
              <ul className="tw-cc-list">
                {p.everyday.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
