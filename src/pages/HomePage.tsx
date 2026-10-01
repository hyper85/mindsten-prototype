import { Camera, ChevronRight, Clock, Footprints, LocateFixed, MapPin, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CategoryIcon } from '../components/CategoryIcon';
import { ScanIllustration } from '../components/Illustrations';
import { LargeTitle, Page, Section } from '../components/Layout';
import { List, Row } from '../components/List';
import { PersonRow } from '../components/PersonRow';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getNearbyPersons, getPersons, getRoutes, type NearbyPerson } from '../lib/api';
import { formatToday, greeting } from '../lib/format';
import { useGeolocation } from '../lib/geo';
import type { Person, ThemedRoute } from '../types';
import { useDocumentTitle } from '../lib/title';

/** Persons born or died on today's day-of-month. */
function onThisDay(persons: Person[], today = new Date()) {
  const md = `-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const hits: Array<{ person: Person; label: string }> = [];
  for (const person of persons) {
    if (person.birthDate?.endsWith(md))
      hits.push({ person, label: `Født i dag i ${person.birthYear}` });
    else if (person.deathDate?.endsWith(md))
      hits.push({ person, label: `Døde i dag i ${person.deathYear}` });
  }
  return hits.slice(0, 3);
}

function LocationPrompt({ status, onLocate }: { status: string; onLocate: () => void }) {
  const denied = status === 'denied' || status === 'unavailable';
  return (
    <div className="prompt-card">
      <span className="icon-circle" aria-hidden="true">
        <LocateFixed />
      </span>
      <div>
        <div className="prompt-card-title">Hvem ligger begravet omkring dig?</div>
        <p className="prompt-card-text">
          {denied
            ? 'Placering er slået fra. Slå den til i browserens indstillinger for at se grave i nærheden.'
            : 'Brug din placering til at finde kendte grave i nærheden.'}
        </p>
        {!denied && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLocate}
            disabled={status === 'locating'}
          >
            {status === 'locating' ? 'Finder dig…' : 'Brug min placering'}
          </button>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { coords, status, locate } = useGeolocation();
  const [nearby, setNearby] = useState<NearbyPerson[] | null>(null);
  const [featured, setFeatured] = useState<Person[]>([]);
  const [routes, setRoutes] = useState<ThemedRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(null);
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
    let cancelled = false;
    getNearbyPersons(coords, 5, 2500)
      .then((result) => !cancelled && setNearby(result))
      .catch(() => !cancelled && setNearby([]));
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const today = useMemo(() => onThisDay(featured), [featured]);
  const first = nearby?.[0];
  const here =
    first && first.distanceMeters !== null && first.distanceMeters < 600 ? first.person : null;
  const nothingNearby = Boolean(coords && nearby && nearby.length === 0);
  const list: NearbyPerson[] = nothingNearby
    ? featured.slice(0, 5).map((person) => ({ person, distanceMeters: null }))
    : (nearby ?? []);

  if (error) {
    return (
      <Page>
        <EmptyState title="Kunne ikke indlæse" description={error} />
      </Page>
    );
  }

  return (
    <Page>
      <LargeTitle eyebrow={formatToday()} title={greeting()} />
      {here && (
        <div className="location-pill">
          <MapPin aria-hidden="true" />
          Du er ved {here.cemetery}
        </div>
      )}

      <div className="hero">
        <ScanIllustration className="hero-art" />
        <div className="eyebrow">Sådan virker det</div>
        <h2 className="hero-title">Hvem ligger her?</h2>
        <p className="hero-text">
          Peg kameraet mod en gravsten. Vi læser navn og årstal – og fortæller historien om personen
          og tiden, de levede i.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/scanner')}>
          <Camera aria-hidden="true" />
          Scan en gravsten
        </button>
        <button type="button" className="btn btn-plain" onClick={() => navigate('/search')}>
          eller søg efter et navn
        </button>
      </div>

      <Section
        title={coords && !nothingNearby ? 'I nærheden' : 'Kendte grave'}
        action={
          <Link className="section-action" to="/map">
            Se kort
            <ChevronRight aria-hidden="true" />
          </Link>
        }
        footer={
          nothingNearby
            ? 'Der er ingen kendte grave lige her – her er nogle af de mest kendte.'
            : undefined
        }
      >
        {status !== 'ok' && <LocationPrompt status={status} onLocate={locate} />}
        {!nearby ? (
          <LoadingState />
        ) : (
          <List inset={72}>
            {list.map((n) => (
              <PersonRow key={n.person.id} person={n.person} distanceMeters={n.distanceMeters} />
            ))}
          </List>
        )}
      </Section>

      {today.length > 0 && (
        <Section title="På denne dag">
          <List inset={72}>
            {today.map(({ person, label }) => (
              <PersonRow key={person.id} person={person} subtitle={label} />
            ))}
          </List>
        </Section>
      )}

      <Section title="Temaruter">
        {!routes ? (
          <LoadingState />
        ) : (
          <div className="rail">
            {routes.map((r) => (
              <button
                key={r.id}
                type="button"
                className="route-card"
                onClick={() => navigate(`/route/${r.id}`)}
              >
                <CategoryIcon category={r.category} size={36} />
                <div>
                  <div className="route-card-title">{r.title}</div>
                  <div className="route-card-sub">{r.subtitle}</div>
                </div>
                <div className="meta">
                  <span>
                    <Clock aria-hidden="true" />
                    {r.duration}
                  </span>
                  <span>
                    <Footprints aria-hidden="true" />
                    {r.distance}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section>
        <List>
          <Row
            leading={
              <span className="icon-square" style={{ background: 'var(--tint)' }}>
                <Plus aria-hidden="true" />
              </span>
            }
            title="Mangler en grav?"
            subtitle="Tilføj en person, så andre kan finde historien"
            to="/submit"
          />
        </List>
      </Section>
    </Page>
  );
}
