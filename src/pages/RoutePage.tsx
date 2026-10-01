import { Clock, Footprints, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { CategoryIcon } from '../components/CategoryIcon';
import { NavBar, Page, Section } from '../components/Layout';
import { List, Row } from '../components/List';
import { personSubtitle } from '../lib/format';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getPersonsByIds, getRouteById } from '../lib/api';
import { directionsUrl } from '../lib/geo';
import type { Person, ThemedRoute } from '../types';

export function RoutePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [route, setRoute] = useState<ThemedRoute | null | undefined>(undefined);
  const [stops, setStops] = useState<Person[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRouteById(Number(id))
      .then(async (r) => {
        if (cancelled) return;
        setRoute(r);
        if (r) {
          const persons = await getPersonsByIds(r.personIds);
          if (!cancelled) setStops(persons);
        }
      })
      .catch(() => !cancelled && setRoute(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (route === undefined) {
    return (
      <>
        <NavBar />
        <LoadingState />
      </>
    );
  }
  if (route === null) {
    return (
      <>
        <NavBar />
        <EmptyState
          title="Ruten findes ikke"
          actionLabel="Til forsiden"
          onAction={() => navigate('/home')}
        />
      </>
    );
  }

  const first = stops?.find((p) => p.lat !== null && p.lng !== null);

  return (
    <>
      <NavBar title={route.title} />
      <Page>
        <header className="person-head" style={{ marginTop: 8 }}>
          <CategoryIcon category={route.category} size={64} />
          <div className="eyebrow" style={{ marginTop: 6 }}>
            Temarute
          </div>
          <h1 className="person-name">{route.title}</h1>
          <div className="meta" style={{ justifyContent: 'center', fontSize: 14 }}>
            <span>
              <MapPin aria-hidden="true" />
              {route.subtitle}
            </span>
            <span>
              <Clock aria-hidden="true" />
              {route.duration}
            </span>
            <span>
              <Footprints aria-hidden="true" />
              {route.distance}
            </span>
          </div>
        </header>

        {first && (
          <a
            className="btn btn-primary"
            style={{ marginTop: 22 }}
            href={directionsUrl(first.lat as number, first.lng as number)}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation aria-hidden="true" />
            Start ved første stop
          </a>
        )}

        <Section title={`${route.personIds.length} stop`}>
          {!stops ? (
            <LoadingState />
          ) : (
            <List inset={72}>
              {stops.map((p, i) => (
                <Row
                  key={p.id}
                  leading={
                    <span style={{ position: 'relative' }}>
                      <Avatar person={p} />
                      <span
                        className="stop-number"
                        style={{
                          position: 'absolute',
                          right: -4,
                          bottom: -4,
                          width: 20,
                          height: 20,
                          fontSize: 11,
                          boxShadow: '0 0 0 2px #fff',
                        }}
                      >
                        {i + 1}
                      </span>
                    </span>
                  }
                  title={p.name}
                  subtitle={personSubtitle(p)}
                  to={`/person/${p.id}`}
                />
              ))}
            </List>
          )}
        </Section>
      </Page>
    </>
  );
}
