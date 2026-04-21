import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { LoadingState, EmptyState } from '../components/StatePanel';
import { getNearbyPersons, getRoutes } from '../lib/api';
import type { Person, ThemedRoute } from '../types';

const NEARBY_DISTANCES = ['120m', '180m', '350m'];

export function HomePage() {
  const navigate = useNavigate();
  const [nearby, setNearby] = useState<Person[] | null>(null);
  const [routes, setRoutes] = useState<ThemedRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getNearbyPersons(3), getRoutes()])
      .then(([nearbyResult, routesResult]) => {
        if (cancelled) return;
        setNearby(nearbyResult);
        setRoutes(routesResult);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Kunne ikke indlæse data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="home-screen">
        <EmptyState title="Kunne ikke indlæse" description={error} />
      </div>
    );
  }

  if (!nearby || !routes) {
    return (
      <div className="home-screen">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="home-screen">
      <div className="greeting fade-up">God morgen 👋</div>
      <div className="greeting-sub fade-up fade-up-d1">Assistens Kirkegård · København</div>

      <div className="section-label fade-up fade-up-d2" style={{ marginTop: 8 }}>
        <span style={{ color: 'var(--moss-400)' }}>{Icons.pin}</span> I nærheden
      </div>

      {nearby.length === 0 ? (
        <EmptyState title="Ingen graver i nærheden" description="Prøv at åbne kortet." />
      ) : (
        nearby.map((p, i) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            className={`nearby-card fade-up fade-up-d${i + 2}`}
            onClick={() => navigate(`/person/${p.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/person/${p.id}`);
              }
            }}
          >
            <div className="nearby-avatar">{p.name.charAt(0)}</div>
            <div className="nearby-info">
              <div className="nearby-name">{p.name}</div>
              <div className="nearby-meta">
                {p.profession} · {p.born.split(' ').pop()}–{p.died.split(' ').pop()}
              </div>
              <div className="nearby-dist">
                {Icons.pin} {NEARBY_DISTANCES[i] ?? '—'}
              </div>
            </div>
          </div>
        ))
      )}

      <div className="section-label fade-up" style={{ marginTop: 24 }}>
        Temaruter
      </div>
      <div className="routes-scroll fade-up fade-up-d1">
        {routes.map((r) => (
          <div key={r.id} className="route-card">
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
    </div>
  );
}
