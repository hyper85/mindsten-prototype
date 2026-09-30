import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { PersonListItem } from '../components/PersonListItem';
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

  if (route === undefined) return <LoadingState />;
  if (route === null) {
    return (
      <div className="profile-screen">
        <EmptyState
          title="Ruten findes ikke"
          actionLabel="Til forsiden"
          onAction={() => navigate('/home')}
        />
      </div>
    );
  }

  const first = stops?.find((p) => p.lat !== null && p.lng !== null);

  return (
    <div className="profile-screen">
      <PageHeader title="Temarute" />
      <div className="person-name-area">
        <div className="route-emoji">{route.emoji}</div>
        <h1 className="person-main-name">{route.title}</h1>
        <div className="person-dates">
          {route.subtitle} · {route.duration} · {route.distance}
        </div>
      </div>
      {first && (
        <div className="grave-actions" style={{ padding: '16px 20px' }}>
          <a
            className="primary-btn"
            href={directionsUrl(first.lat as number, first.lng as number)}
            target="_blank"
            rel="noreferrer"
          >
            {Icons.directions} Start ved første stop
          </a>
        </div>
      )}
      <div style={{ padding: '0 20px' }}>
        <div className="section-label">{route.personIds.length} stop</div>
        {!stops ? (
          <LoadingState />
        ) : (
          stops.map((p, i) => (
            <PersonListItem key={p.id} person={p} badge={`Stop ${i + 1} · ${p.cemetery}`} />
          ))
        )}
      </div>
    </div>
  );
}
