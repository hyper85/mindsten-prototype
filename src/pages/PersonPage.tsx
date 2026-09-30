import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildEraSnapshot } from '../../supabase/functions/_shared/era.ts';
import { ConfidenceCounter } from '../components/ConfidenceCounter';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getPersonById } from '../lib/api';
import { ageAtDeath, CATEGORY_META } from '../lib/format';
import { directionsUrl } from '../lib/geo';
import { isFavorite, recordVisit, toggleFavorite } from '../lib/storage';
import type { Person } from '../types';

type Status = 'loading' | 'ok' | 'not-found' | 'error';

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const matchScore = (location.state as { matchScore?: number } | null)?.matchScore;
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [expanded, setExpanded] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [shared, setShared] = useState(false);

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
          return;
        }
        setPerson(result);
        setFavorite(isFavorite(result.id));
        recordVisit(result.id, result.name);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const era = useMemo(() => {
    if (!person?.birthYear || !person.deathYear) return null;
    return buildEraSnapshot(person.birthYear, person.deathYear);
  }, [person]);

  if (status === 'loading') {
    return (
      <div className="profile-screen">
        <LoadingState />
      </div>
    );
  }

  if (status === 'not-found' || status === 'error' || !person) {
    return (
      <div className="profile-screen">
        <EmptyState
          title={status === 'not-found' ? 'Person ikke fundet' : 'Kunne ikke hente person'}
          description={
            status === 'not-found'
              ? 'Den ønskede person findes ikke i databasen.'
              : 'Prøv igen om et øjeblik.'
          }
          actionLabel="Tilbage til hjem"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  const age = ageAtDeath(person.birthDate, person.deathDate, person.birthYear, person.deathYear);
  const highlights = era
    ? era.events
        .filter((e) => e.scope === 'dk' && e.age > 0 && e.year < (person.deathYear ?? 0))
        .slice(0, 3)
    : [];

  const share = async () => {
    const url = window.location.href;
    const text = `${person.name} (${person.born} – ${person.died}) · ${person.cemetery}`;
    try {
      if (navigator.share) await navigator.share({ title: person.name, text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShared(true);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="profile-screen">
      <PageHeader
        title={person.cemetery || 'Person'}
        actions={
          <>
            <button type="button" className="profile-back" aria-label="Del" onClick={share}>
              {Icons.share}
            </button>
            <button
              type="button"
              className={`profile-back ${favorite ? 'fav-on' : ''}`}
              aria-label={favorite ? 'Fjern fra favoritter' : 'Gem som favorit'}
              aria-pressed={favorite}
              onClick={() => setFavorite(toggleFavorite(person.id))}
            >
              {favorite ? Icons.heartFilled : Icons.heart}
            </button>
          </>
        }
      />
      {shared && <div className="toast">Link kopieret</div>}

      {matchScore !== undefined && (
        <div className="match-banner fade-up">
          <span style={{ color: 'var(--moss-300)' }}>{Icons.check}</span>
          Person fundet
          <ConfidenceCounter value={matchScore} />
        </div>
      )}

      {person.imageUrl && (
        <figure className="person-portrait fade-up">
          <img
            src={person.imageUrl}
            alt={`Portræt af ${person.name}`}
            referrerPolicy="no-referrer"
          />
          {person.imageCredit && <figcaption>{person.imageCredit}</figcaption>}
        </figure>
      )}

      <div className="person-name-area fade-up fade-up-d1">
        <div className="person-category">
          {CATEGORY_META[person.category].emoji} {CATEGORY_META[person.category].label}
        </div>
        <h1 className="person-main-name">{person.name}</h1>
        <div className="person-dates">
          {person.born} – {person.died}
        </div>
      </div>

      <div className="quick-facts fade-up fade-up-d2">
        <div className="fact-card">
          <div className="fact-label">Virke</div>
          <div className="fact-value">
            {person.profession || CATEGORY_META[person.category].label}
          </div>
        </div>
        <div className="fact-card">
          <div className="fact-label">Blev</div>
          <div className="fact-value">{age !== null ? `${age} år` : 'Ukendt'}</div>
        </div>
        <div className="fact-card">
          <div className="fact-label">Født i</div>
          <div className="fact-value">{person.birthPlace ?? 'Ukendt'}</div>
        </div>
        <div className="fact-card">
          <div className="fact-label">Æra</div>
          <div className="fact-value">{person.era}</div>
        </div>
      </div>

      {person.shortBio && (
        <div className="bio-section fade-up fade-up-d3">
          <div className="section-label">Biografi</div>
          <div className="bio-text">{expanded ? person.fullBio : person.shortBio}</div>
          {person.fullBio && person.fullBio !== person.shortBio && (
            <button type="button" className="bio-toggle" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Vis mindre' : 'Læs mere…'}
            </button>
          )}
        </div>
      )}

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
        {highlights.length > 0 && (
          <ul className="tw-highlights">
            {highlights.map((e) => (
              <li key={`${e.year}-${e.title}`}>
                <strong>
                  {e.year} · {e.age} år
                </strong>{' '}
                {e.title}
              </li>
            ))}
          </ul>
        )}
        <div className="tw-play">
          <div className="tw-play-circle">{Icons.play}</div>
          Oplev tiden, {person.name} levede i
        </div>
      </div>

      {person.timeline.length > 0 && (
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
      )}

      <div className="grave-card">
        <div className="section-label">Gravstedet</div>
        <div className="grave-name">
          {person.cemeteryId ? (
            <Link to={`/cemetery/${person.cemeteryId}`}>{person.cemetery}</Link>
          ) : (
            person.cemetery
          )}
          {person.city && <span className="grave-city"> · {person.city}</span>}
        </div>
        {person.locationPrecision === 'cemetery' && (
          <div className="grave-precision">
            Placeringen er kirkegårdens — ikke den præcise grav.
          </div>
        )}
        {person.lat !== null && person.lng !== null && (
          <div className="grave-actions">
            <a
              className="secondary-btn"
              href={directionsUrl(person.lat, person.lng)}
              target="_blank"
              rel="noreferrer"
            >
              {Icons.directions} Vis vej
            </a>
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                navigate(`/map?focus=${person.id}&lat=${person.lat}&lng=${person.lng}`)
              }
            >
              {Icons.map} Se på kortet
            </button>
          </div>
        )}
      </div>

      <div className="sources-section">
        <div className="section-label">Kilder</div>
        {person.sources.map((s, i) =>
          s.url ? (
            <a
              key={`${s.label}-${i}`}
              className="source-item"
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              <span style={{ color: 'var(--stone-600)' }}>{Icons.source}</span>
              {s.label} {Icons.external}
            </a>
          ) : (
            <div key={`${s.label}-${i}`} className="source-item">
              <span style={{ color: 'var(--stone-600)' }}>{Icons.source}</span>
              {s.label}
            </div>
          ),
        )}
        <Link
          className="report-link"
          to="/submit"
          state={{ correctionFor: person.id, prefill: { name: person.name } }}
        >
          Er noget forkert? Foreslå en rettelse
        </Link>
      </div>
    </div>
  );
}
