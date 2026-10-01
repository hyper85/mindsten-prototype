import { Crown, Hourglass, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildEraSnapshot } from '../../supabase/functions/_shared/era.ts';
import { NavBar, Page, Section } from '../components/Layout';
import { List, Row } from '../components/List';
import { SegmentedControl } from '../components/SegmentedControl';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getEraStory, getPersonById } from '../lib/api';
import { formatNumber } from '../lib/format';
import { recordTimeWindow } from '../lib/storage';
import { isSupabaseConfigured } from '../lib/supabase';
import type { EraStory, Person } from '../types';

type StoryState = 'idle' | 'loading' | 'ok' | 'failed';

const PERIOD_COLORS: Record<string, string> = {
  viking: '#8c6d4f',
  middelalder: '#7b6a9a',
  renaessance: '#a0644f',
  enevaelde: '#b08a3e',
  guldalder: '#d4a63e',
  demokrati: '#5c8a6e',
  verdenskrige: '#7c8691',
  velfaerd: '#4f86b8',
  digital: '#6c7fd1',
};

export function TimeWindowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not-found'>('loading');
  const [story, setStory] = useState<EraStory | null>(null);
  const [storyState, setStoryState] = useState<StoryState>('idle');
  const [scope, setScope] = useState<'all' | 'dk'>('all');

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
      .catch(() => !cancelled && setStatus('not-found'));
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
      <>
        <NavBar />
        <LoadingState />
      </>
    );
  }

  if (!person || !snapshot) {
    return (
      <>
        <NavBar />
        <EmptyState
          title="Tidsvindue ikke tilgængeligt"
          description="Vi mangler årstal for personen."
          actionLabel="Tilbage"
          onAction={() => navigate(-1)}
        />
      </>
    );
  }

  const events = snapshot.events.filter((e) => scope === 'all' || e.scope === 'dk');
  const { populationAtBirth: popBirth, populationAtDeath: popDeath } = snapshot;

  return (
    <>
      <NavBar
        title="Tidsvindue"
        backLabel={person.name.length <= 16 ? person.name : 'Tilbage'}
        fallback={`/person/${person.id}`}
      />
      <Page flush>
        <header className="tw-hero">
          <div className="eyebrow">
            <Hourglass aria-hidden="true" />
            Tidsvindue
          </div>
          <h1 className="tw-hero-title">{person.timeWindowTitle}</h1>
          <div className="tw-hero-sub">
            {person.name} · {snapshot.birthYear}–{snapshot.deathYear}
          </div>
          <div className="lifebar" aria-hidden="true">
            {snapshot.periods.map((p) => {
              const from = Math.max(p.from, snapshot.birthYear);
              const to = Math.min(p.to, snapshot.deathYear);
              return (
                <span
                  key={p.id}
                  style={{
                    flex: Math.max(to - from, 1),
                    background: PERIOD_COLORS[p.id] ?? '#b9b2a6',
                  }}
                />
              );
            })}
          </div>
          <ul className="lifebar-legend">
            {snapshot.periods.map((p) => (
              <li key={p.id}>
                <i style={{ background: PERIOD_COLORS[p.id] ?? '#b9b2a6' }} />
                {p.name}
              </li>
            ))}
          </ul>
        </header>

        <div className="card">
          <p className="body-text">{snapshot.period.summary}</p>
        </div>

        {(isSupabaseConfigured || story) && (
          <Section>
            {storyState === 'ok' && story ? (
              <article className="story">
                <h2>{story.title}</h2>
                <p className="story-intro">{story.intro}</p>
                {story.sections.map((s) => (
                  <section key={s.heading}>
                    <h3>{s.heading}</h3>
                    <p>{s.body}</p>
                  </section>
                ))}
                {story.imagine && <p className="story-imagine">{story.imagine}</p>}
                <p className="footnote">
                  Fortalt af AI ud fra kuraterede historiske fakta og personens biografi. Kan
                  indeholde fejl – tjek kilderne.
                </p>
              </article>
            ) : (
              <button
                type="button"
                className="story-cta"
                onClick={loadStory}
                disabled={storyState === 'loading'}
              >
                <span className="icon-circle" aria-hidden="true">
                  {storyState === 'loading' ? <span className="spinner" /> : <Sparkles />}
                </span>
                <span>
                  <strong>
                    {storyState === 'loading' ? 'Skriver fortællingen…' : 'Fortæl mig om tiden'}
                  </strong>
                  <span>
                    {storyState === 'failed'
                      ? 'Det lykkedes ikke. Prøv igen om lidt.'
                      : 'En kort fortælling om livet i Danmark dengang'}
                  </span>
                </span>
              </button>
            )}
          </Section>
        )}

        {(popBirth || popDeath) && (
          <Section title="Danmark i tal" footer="Befolkningstal er afrundede skøn (ca.).">
            <div className="stats">
              {popBirth && (
                <div className="stat">
                  <div className="stat-value">
                    {formatNumber(Math.round(popBirth.denmark / 1000) * 1000)}
                  </div>
                  <div className="stat-label">danskere i {snapshot.birthYear}</div>
                </div>
              )}
              {popDeath && (
                <div className="stat">
                  <div className="stat-value">
                    {formatNumber(Math.round(popDeath.denmark / 1000) * 1000)}
                  </div>
                  <div className="stat-label">danskere i {snapshot.deathYear}</div>
                </div>
              )}
              {popBirth?.lifeExpectancy && (
                <div className="stat">
                  <div className="stat-value">{popBirth.lifeExpectancy} år</div>
                  <div className="stat-label">forventet levealder</div>
                </div>
              )}
            </div>
          </Section>
        )}

        {snapshot.monarchs.length > 0 && (
          <Section
            title={
              snapshot.monarchs.length === 1
                ? 'Regent i levetiden'
                : `${snapshot.monarchs.length} regenter i levetiden`
            }
          >
            <List inset={58}>
              {snapshot.monarchs.map((m) => (
                <Row
                  key={`${m.name}-${m.from}`}
                  leading={
                    <span className="icon-square" style={{ background: 'var(--gold-soft)' }}>
                      <Crown aria-hidden="true" style={{ color: 'var(--gold)' }} />
                    </span>
                  }
                  title={m.name}
                  wrap
                  subtitle={
                    m.ageAtStart === null
                      ? `Regent, da ${person.name} blev født`
                      : m.ageAtStart === 0
                        ? `Besteg tronen samme år, som ${person.name} blev født`
                        : `Besteg tronen, da ${person.name} var ${m.ageAtStart} år`
                  }
                  trailing={
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
                      {m.from}–{m.to ?? 'nu'}
                    </span>
                  }
                />
              ))}
            </List>
          </Section>
        )}

        <Section title={`Mens ${person.name} levede`}>
          <div style={{ marginBottom: 12 }}>
            <SegmentedControl
              label="Vis begivenheder"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: 'Danmark & verden' },
                { value: 'dk', label: 'Kun Danmark' },
              ]}
            />
          </div>
          <div className="card">
            {events.length === 0 ? (
              <p className="muted">Ingen registrerede begivenheder i perioden endnu.</p>
            ) : (
              <ol className="timeline">
                {events.map((e) => (
                  <li
                    key={`${e.year}-${e.title}`}
                    className={`tl-item ${e.scope === 'world' ? 'is-world' : ''}`}
                  >
                    <div className="tl-year">
                      {e.year}
                      <span className="tl-age">{e.age} år</span>
                    </div>
                    <div className="tl-text">{e.title}</div>
                    {e.detail && <div className="tl-detail">{e.detail}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Section>

        <Section title="Hverdagen">
          <div className="stack-sm">
            {snapshot.periods.map((p) => (
              <div key={p.id} className="card">
                <div className="eyebrow" style={{ color: PERIOD_COLORS[p.id] }}>
                  {p.name} · {Math.max(p.from, snapshot.birthYear)}–
                  {Math.min(p.to, snapshot.deathYear)}
                </div>
                <ul className="everyday">
                  {p.everyday.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </Page>
    </>
  );
}
