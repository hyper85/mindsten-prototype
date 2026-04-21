import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfidenceCounter } from '../components/ConfidenceCounter';
import { Icons } from '../components/Icons';
import { LoadingState, EmptyState } from '../components/StatePanel';
import { getPersonById } from '../lib/api';
import type { Person } from '../types';

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not-found' | 'error'>('loading');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setStatus('not-found');
      return;
    }
    setStatus('loading');
    getPersonById(numericId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setStatus('not-found');
        } else {
          setPerson(result);
          setStatus('ok');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="profile-screen">
        <LoadingState />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="profile-screen">
        <EmptyState
          title="Person ikke fundet"
          description="Den ønskede person findes ikke i databasen."
          actionLabel="Tilbage til hjem"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  if (status === 'error' || !person) {
    return (
      <div className="profile-screen">
        <EmptyState
          title="Kunne ikke hente person"
          description="Prøv igen om et øjeblik."
          actionLabel="Tilbage"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <button
          type="button"
          className="profile-back"
          aria-label="Tilbage"
          onClick={() => navigate(-1)}
        >
          {Icons.back}
        </button>
        <div className="profile-header-title">{person.cemetery}</div>
      </div>

      <div className="match-banner fade-up">
        <span style={{ color: 'var(--moss-300)' }}>{Icons.check}</span>
        Person fundet
        <ConfidenceCounter value={person.confidence} />
      </div>

      <div className="person-name-area fade-up fade-up-d1">
        <div className="person-main-name">{person.name}</div>
        <div className="person-dates">
          {person.born} – {person.died}
        </div>
      </div>

      <div className="quick-facts fade-up fade-up-d2">
        <div className="fact-card">
          <div className="fact-label">Profession</div>
          <div className="fact-value">{person.profession}</div>
        </div>
        <div className="fact-card">
          <div className="fact-label">Begravet</div>
          <div className="fact-value">{person.cemetery.split(' ')[0]}</div>
        </div>
        <div className="fact-card">
          <div className="fact-label">Æra</div>
          <div className="fact-value">{person.era}</div>
        </div>
        <div className="fact-card">
          <div className="fact-label">By</div>
          <div className="fact-value">{person.city}</div>
        </div>
      </div>

      <div className="bio-section fade-up fade-up-d3">
        <div className="section-label">Biografi</div>
        <div className="bio-text">{expanded ? person.fullBio : person.shortBio}</div>
        <button type="button" className="bio-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Vis mindre' : 'Læs mere…'}
        </button>
      </div>

      <div
        className="time-window-cta fade-up fade-up-d4"
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/person/${person.id}/time-window`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/person/${person.id}/time-window`);
          }
        }}
      >
        <div className="tw-label">Tidsvindue</div>
        <div className="tw-title">{person.timeWindowTitle}</div>
        <div className="tw-era">
          {person.eraYears} · {person.era}
        </div>
        <div className="tw-play">
          <div className="tw-play-circle">{Icons.play}</div>
          Se tidsvindue
        </div>
      </div>

      <div className="timeline-section">
        <div className="section-label">Tidslinje</div>
        {person.timeline.map((t, i) => (
          <div
            key={`${t.year}-${i}`}
            className="timeline-item fade-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="timeline-dot" />
            <div className="timeline-year">{t.year}</div>
            <div className="timeline-event">{t.event}</div>
          </div>
        ))}
      </div>

      <div className="sources-section">
        <div className="section-label">Kilder</div>
        {person.sources.map((s, i) => (
          <div key={`${s}-${i}`} className="source-item">
            <span style={{ color: 'var(--stone-600)' }}>{Icons.source}</span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
