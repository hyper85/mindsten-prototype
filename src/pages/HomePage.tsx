import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { PersonListItem } from '../components/PersonListItem';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getNearbyPersons, getPersons, getRoutes, type NearbyPerson } from '../lib/api';
import { useGeolocation } from '../lib/geo';
import type { Person, ThemedRoute } from '../types';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'God nat';
  if (h < 10) return 'God morgen';
  if (h < 12) return 'God formiddag';
  if (h < 18) return 'God eftermiddag';
  return 'God aften';
}

/** Persons born or died on today's day-of-month. */
function onThisDay(
  persons: Person[],
  today = new Date(),
): Array<{ person: Person; kind: 'født' | 'død' }> {
  const md = `-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const hits: Array<{ person: Person; kind: 'født' | 'død' }> = [];
  for (const person of persons) {
    if (person.birthDate?.endsWith(md)) hits.push({ person, kind: 'født' });
    else if (person.deathDate?.endsWith(md)) hits.push({ person, kind: 'død' });
  }
  return hits.slice(0, 3);
}

export function HomePage() {
  const navigate = useNavigate();
  const { coords, status, locate } = useGeolocation();
  const [nearby, setNearby] = useState<NearbyPerson[] | null>(null);
  const [routes, setRoutes] = useState<ThemedRoute[] | null>(null);
  const [featured, setFeatured] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRoutes(), getPersons({ limit: 500 })])
      .then(([routesResult, personsResult]) => {
        if (cancelled) return;
        setRoutes(routesResult);
        setFeatured(personsResult);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kunne ikke indlæse data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Wait for the geolocation attempt to settle before loading "nearby".
    if (status === 'locating' || status === 'idle') return;
    let cancelled = false;
    getNearbyPersons(coords, 5, 2500)
      .then((result) => {
        if (!cancelled) setNearby(result);
      })
      .catch(() => {
        if (!cancelled) setNearby([]);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, status]);

  const today = useMemo(() => onThisDay(featured), [featured]);
  const first = nearby?.[0];
  const here = first && first.distanceMeters !== null ? first.person : null;

  if (error) {
    return (
      <div className="home-screen">
        <EmptyState title="Kunne ikke indlæse" description={error} />
      </div>
    );
  }

  return (
    <div className="home-screen">
      <div className="greeting fade-up">{greeting()} 👋</div>
      <div className="greeting-sub fade-up fade-up-d1">
        {here ? `${here.cemetery} · ${here.city}` : 'Peg kameraet mod en gravsten og mød personen'}
      </div>

      <button
        type="button"
        className="hero-scan fade-up fade-up-d1"
        onClick={() => navigate('/scanner')}
      >
        <span className="hero-scan-icon">{Icons.camera}</span>
        <span>
          <span className="hero-scan-title">Scan en gravsten</span>
          <span className="hero-scan-sub">Navn, årstal og GPS finder personen</span>
        </span>
      </button>

      <div className="section-label fade-up fade-up-d2" style={{ marginTop: 20 }}>
        <span style={{ color: 'var(--moss-400)' }}>{Icons.pin}</span>
        {coords ? 'I nærheden' : 'Kendte grave'}
      </div>

      {status === 'denied' || status === 'unavailable' ? (
        <div className="inline-note">
          Placering er slået fra — vi viser kendte grave i stedet.{' '}
          <button type="button" className="link-btn" onClick={locate}>
            Prøv igen
          </button>
        </div>
      ) : null}

      {!nearby ? (
        <LoadingState label={status === 'locating' ? 'Finder din placering…' : 'Indlæser…'} />
      ) : nearby.length === 0 ? (
        <EmptyState
          title="Ingen kendte grave lige her"
          description="Åbn kortet for at finde den nærmeste kirkegård med kendte personer."
          actionLabel="Åbn kortet"
          onAction={() => navigate('/map')}
        />
      ) : (
        nearby.map((n, i) => (
          <PersonListItem
            key={n.person.id}
            person={n.person}
            distanceMeters={n.distanceMeters}
            className={`fade-up fade-up-d${Math.min(i + 2, 5)}`}
          />
        ))
      )}

      {today.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>
            På denne dag
          </div>
          {today.map(({ person, kind }) => (
            <PersonListItem
              key={person.id}
              person={person}
              badge={`${kind === 'født' ? 'Født' : 'Død'} ${kind === 'født' ? person.born : person.died}`}
            />
          ))}
        </>
      )}

      <div className="section-label" style={{ marginTop: 24 }}>
        Temaruter
      </div>
      {!routes ? (
        <LoadingState />
      ) : (
        <div className="routes-scroll">
          {routes.map((r) => (
            <div
              key={r.id}
              className="route-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/route/${r.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/route/${r.id}`);
                }
              }}
            >
              <div className="route-emoji">{r.emoji}</div>
              <div className="route-title">{r.title}</div>
              <div className="route-subtitle">{r.subtitle}</div>
              <div className="route-details">
                <span className="route-detail">
                  {Icons.clock} {r.duration}
                </span>
                <span className="route-detail">
                  {Icons.walk} {r.distance}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="ghost-card" onClick={() => navigate('/submit')}>
        {Icons.plus}
        <span>
          <strong>Mangler en grav?</strong>
          <br />
          Tilføj en person, så andre kan finde historien.
        </span>
      </button>
    </div>
  );
}
