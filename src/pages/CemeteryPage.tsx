import { Church, Map as MapIcon, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, Page, Section } from '../components/Layout';
import { List } from '../components/List';
import { PersonRow } from '../components/PersonRow';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getCemeteryById, getPersons } from '../lib/api';
import { directionsUrl } from '../lib/geo';
import type { Cemetery, Person } from '../types';

export function CemeteryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cemetery, setCemetery] = useState<Cemetery | null | undefined>(undefined);
  const [persons, setPersons] = useState<Person[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cemeteryId = Number(id);
    Promise.all([getCemeteryById(cemeteryId), getPersons({ cemeteryId, limit: 500 })])
      .then(([c, p]) => {
        if (cancelled) return;
        setCemetery(c);
        setPersons(
          p.sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name, 'da')),
        );
      })
      .catch(() => !cancelled && setCemetery(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (cemetery === undefined) {
    return (
      <>
        <NavBar />
        <LoadingState />
      </>
    );
  }
  if (cemetery === null) {
    return (
      <>
        <NavBar />
        <EmptyState
          title="Kirkegård ikke fundet"
          actionLabel="Til søgning"
          onAction={() => navigate('/search')}
        />
      </>
    );
  }

  return (
    <>
      <NavBar title={cemetery.name} fallback="/search" />
      <Page>
        <header className="person-head" style={{ marginTop: 8 }}>
          <span
            className="icon-circle"
            style={{ width: 64, height: 64, background: '#efe8dc', color: '#7d6a4b' }}
            aria-hidden="true"
          >
            <Church size={30} />
          </span>
          <h1 className="person-name">{cemetery.name}</h1>
          <div className="person-dates">{cemetery.city}</div>
        </header>
        {cemetery.description && (
          <p className="body-text center muted" style={{ marginTop: 10 }}>
            {cemetery.description}
          </p>
        )}

        <div className="actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <a
            className="action"
            href={directionsUrl(cemetery.lat, cemetery.lng)}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation aria-hidden="true" />
            Vis vej
          </a>
          <button
            type="button"
            className="action"
            onClick={() => navigate(`/map?lat=${cemetery.lat}&lng=${cemetery.lng}`)}
          >
            <MapIcon aria-hidden="true" />
            Se på kort
          </button>
        </div>

        <Section title={persons ? `${persons.length} kendte grave` : 'Kendte grave'}>
          {!persons ? (
            <LoadingState />
          ) : (
            <List inset={72}>
              {persons.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </List>
          )}
        </Section>
      </Page>
    </>
  );
}
