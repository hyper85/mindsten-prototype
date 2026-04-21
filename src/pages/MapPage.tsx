import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { LoadingState } from '../components/StatePanel';
import { getPersons } from '../lib/api';
import type { CategoryFilter, MapPin, Person } from '../types';

const PIN_POSITIONS: Array<{ x: string; y: string; type: MapPin['type'] }> = [
  { x: '32%', y: '35%', type: 'gold' },
  { x: '58%', y: '28%', type: 'green' },
  { x: '45%', y: '55%', type: 'green' },
  { x: '70%', y: '48%', type: 'green' },
];

const FILTERS: CategoryFilter[] = [
  { id: 'all', label: 'Alle' },
  { id: 'writers', label: '✍️ Forfattere' },
  { id: 'naval', label: '⚓ Flåde' },
  { id: 'science', label: '🔬 Videnskab' },
  { id: 'royals', label: '👑 Konger' },
];

export function MapPage() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[] | null>(null);
  const [filter, setFilter] = useState<CategoryFilter['id']>('all');

  useEffect(() => {
    let cancelled = false;
    getPersons().then((result) => {
      if (!cancelled) setPersons(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pins: MapPin[] = useMemo(() => {
    if (!persons) return [];
    return persons.slice(0, PIN_POSITIONS.length).map((person, i) => ({
      person,
      x: PIN_POSITIONS[i].x,
      y: PIN_POSITIONS[i].y,
      type: PIN_POSITIONS[i].type,
    }));
  }, [persons]);

  const filtered = filter === 'all' ? pins : pins.filter((p) => p.person.category === filter);

  return (
    <div className="map-screen">
      <div className="map-area">
        <div className="map-search-bar">
          <span style={{ color: 'var(--stone-500)' }}>{Icons.search}</span>
          <input placeholder="Søg efter person eller sted…" aria-label="Søg" />
        </div>
        <div className="map-filters">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              className={`map-filter-chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!persons ? (
          <LoadingState />
        ) : (
          <>
            {filtered.map((pin) => (
              <button
                type="button"
                key={pin.person.id}
                aria-label={pin.person.name}
                className={`map-pin ${pin.type}`}
                style={{ left: pin.x, top: pin.y }}
                onClick={() => navigate(`/person/${pin.person.id}`)}
              />
            ))}
            <div className="map-user-dot" style={{ left: '50%', top: '65%' }} />

            <div className="map-bottom-sheet">
              <div className="sheet-handle" />
              <div className="sheet-title">I nærheden</div>
              {filtered.map((pin) => (
                <div
                  key={pin.person.id}
                  role="button"
                  tabIndex={0}
                  className="nearby-card"
                  style={{ marginBottom: 8 }}
                  onClick={() => navigate(`/person/${pin.person.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/person/${pin.person.id}`);
                    }
                  }}
                >
                  <div className="nearby-avatar">{pin.person.name.charAt(0)}</div>
                  <div className="nearby-info">
                    <div className="nearby-name">{pin.person.name}</div>
                    <div className="nearby-meta">{pin.person.profession}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
