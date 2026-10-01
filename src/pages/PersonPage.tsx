import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  ExternalLink,
  Heart,
  Hourglass,
  Map as MapIcon,
  Navigation,
  Share,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { buildEraSnapshot } from '../../supabase/functions/_shared/era.ts';
import { CategoryPill } from '../components/CategoryIcon';
import { CATEGORY_STYLE } from '../lib/categories';
import { Ornament } from '../components/Illustrations';
import { NavBar, Page, Section } from '../components/Layout';
import { List, Row, ValueRow } from '../components/List';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getPersonById } from '../lib/api';
import { ageAtDeath, CATEGORY_META } from '../lib/format';
import { directionsUrl } from '../lib/geo';
import { isFavorite, recordVisit, toggleFavorite } from '../lib/storage';
import { showToast } from '../lib/toast';
import type { Person } from '../types';

type Status = 'loading' | 'ok' | 'not-found' | 'error';

function yearsLabel(person: Person): string {
  return [person.birthYear ?? '', person.deathYear ?? ''].join(' – ');
}

/** The hero: the person's portrait in an arched frame, or a drawn gravestone. */
function Memorial({ person }: { person: Person }) {
  const glow = CATEGORY_STYLE[person.category].soft;
  return (
    <div className="memorial" style={{ ['--memorial-glow' as string]: glow }}>
      {person.imageUrl ? (
        <div>
          <div className="portrait">
            <img
              src={person.imageUrl}
              alt={`Portræt af ${person.name}`}
              referrerPolicy="no-referrer"
            />
          </div>
          {person.imageCredit && <div className="portrait-credit">{person.imageCredit}</div>}
        </div>
      ) : (
        <div className="stone" aria-hidden="true">
          <Ornament className="stone-ornament" />
          <div className="stone-name">{person.name}</div>
          <div className="stone-years">{yearsLabel(person)}</div>
          {person.profession && <div className="stone-epitaph">{person.profession}</div>}
        </div>
      )}
    </div>
  );
}

export function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const matchScore = (location.state as { matchScore?: number } | null)?.matchScore;
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [expanded, setExpanded] = useState(false);
  const [favorite, setFavorite] = useState(false);

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
      <>
        <NavBar />
        <LoadingState />
      </>
    );
  }

  if (status !== 'ok' || !person) {
    return (
      <>
        <NavBar />
        <EmptyState
          title={status === 'not-found' ? 'Person ikke fundet' : 'Kunne ikke hente person'}
          description={
            status === 'not-found'
              ? 'Den ønskede person findes ikke i arkivet.'
              : 'Tjek din forbindelse, og prøv igen om et øjeblik.'
          }
          actionLabel="Til forsiden"
          onAction={() => navigate('/home')}
        />
      </>
    );
  }

  const age = ageAtDeath(person.birthDate, person.deathDate, person.birthYear, person.deathYear);
  const hasLocation = person.lat !== null && person.lng !== null;
  const highlights = era
    ? era.events
        .filter((e) => e.scope === 'dk' && e.age > 0 && e.year < (person.deathYear ?? 0))
        .slice(0, 3)
    : [];
  const bioIsLong = Boolean(person.fullBio && person.fullBio !== person.shortBio);

  const share = async () => {
    const url = window.location.href;
    const text = `${person.name} (${person.born} – ${person.died}) · ${person.cemetery}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: person.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast('Link kopieret');
      }
    } catch {
      /* user cancelled */
    }
  };

  const toggleFav = () => {
    const now = toggleFavorite(person.id);
    setFavorite(now);
    showToast(now ? 'Gemt i dine favoritter' : 'Fjernet fra favoritter');
  };

  return (
    <>
      <NavBar title={person.name} />
      <Page flush>
        <Memorial person={person} />

        {matchScore !== undefined && (
          <div className="match">
            <CircleCheck aria-hidden="true" />
            Personen er fundet
            <span className="badge">{matchScore}% match</span>
          </div>
        )}

        <header className="person-head">
          <CategoryPill category={person.category} />
          <h1 className="person-name">{person.name}</h1>
          <div className="person-dates">
            {person.born} – {person.died}
            {age !== null && ` · ${age} år`}
          </div>
        </header>

        <div className="actions">
          <a
            className="action"
            href={
              hasLocation ? directionsUrl(person.lat as number, person.lng as number) : undefined
            }
            target="_blank"
            rel="noreferrer"
            aria-disabled={!hasLocation}
          >
            <Navigation aria-hidden="true" />
            Vis vej
          </a>
          <button
            type="button"
            className="action"
            aria-disabled={!hasLocation}
            onClick={() => navigate(`/map?focus=${person.id}&lat=${person.lat}&lng=${person.lng}`)}
          >
            <MapIcon aria-hidden="true" />
            Kort
          </button>
          <button type="button" className="action" onClick={share}>
            <Share aria-hidden="true" />
            Del
          </button>
          <button
            type="button"
            className={`action ${favorite ? 'is-on' : ''}`}
            aria-pressed={favorite}
            onClick={toggleFav}
          >
            <Heart aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? 'Gemt' : 'Gem'}
          </button>
        </div>

        {person.shortBio && (
          <Section title="Om personen">
            <div className="card">
              <p className="body-text">{expanded ? person.fullBio : person.shortBio}</p>
              {bioIsLong && (
                <button type="button" className="link-btn" onClick={() => setExpanded(!expanded)}>
                  {expanded ? 'Vis mindre' : 'Læs mere'}
                </button>
              )}
            </div>
          </Section>
        )}

        <Section>
          <div className="tw-card">
            <div className="eyebrow">
              <Hourglass aria-hidden="true" />
              Tidsvindue
            </div>
            <h2 className="tw-card-title">{person.timeWindowTitle}</h2>
            <div className="tw-card-sub">Oplev den tid, {person.name} levede i</div>
            {highlights.length > 0 && (
              <ul className="tw-highlights">
                {highlights.map((e) => (
                  <li key={`${e.year}-${e.title}`}>
                    <span className="age-pill">{e.age} år</span>
                    <span>
                      {e.title} <span style={{ opacity: 0.6 }}>({e.year})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="btn btn-dark"
              style={{ marginTop: highlights.length ? 0 : 16 }}
              onClick={() => navigate(`/person/${person.id}/time-window`)}
            >
              Oplev tiden
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </Section>

        <Section title="Fakta">
          <List>
            <ValueRow
              label="Virke"
              value={person.profession || CATEGORY_META[person.category].label}
            />
            <ValueRow
              label="Født"
              value={[person.born, person.birthPlace].filter(Boolean).join(', ')}
            />
            <ValueRow
              label="Død"
              value={[person.died, person.deathPlace].filter(Boolean).join(', ')}
            />
            {person.cemetery && (
              <Row
                title={<span className="row-label">Begravet</span>}
                trailing={<span style={{ color: 'var(--text)' }}>{person.cemetery}</span>}
                to={person.cemeteryId ? `/cemetery/${person.cemeteryId}` : undefined}
              />
            )}
          </List>
          {person.locationPrecision === 'cemetery' && (
            <div className="section-footer">Kortet viser kirkegården – ikke den præcise grav.</div>
          )}
        </Section>

        {person.timeline.length > 0 && (
          <Section title="Livet i årstal">
            <div className="card">
              <ol className="timeline">
                {person.timeline.map((t, i) => (
                  <li key={`${t.year}-${i}`} className="tl-item">
                    <div className="tl-year">{t.year}</div>
                    <div className="tl-text">{t.event}</div>
                  </li>
                ))}
              </ol>
            </div>
          </Section>
        )}

        <Section title="Kilder">
          <List>
            {person.sources.map((s, i) => (
              <Row
                key={`${s.label}-${i}`}
                leading={<BookOpen size={20} color="var(--text-2)" aria-hidden="true" />}
                title={s.label}
                href={s.url ?? undefined}
                trailing={s.url ? <ExternalLink size={16} aria-hidden="true" /> : undefined}
                chevron={false}
              />
            ))}
          </List>
          <div className="section-footer center">
            <Link
              to="/submit"
              state={{ correctionFor: person.id, prefill: { name: person.name } }}
              style={{ color: 'var(--tint)', fontWeight: 500, textDecoration: 'none' }}
            >
              Er noget forkert? Foreslå en rettelse
            </Link>
          </div>
        </Section>
      </Page>
    </>
  );
}
