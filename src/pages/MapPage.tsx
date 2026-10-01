import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import type { MapBounds } from '../components/MapView';
import { PersonListItem } from '../components/PersonListItem';
import { LoadingState } from '../components/StatePanel';
import { getPersons } from '../lib/api';
import { CATEGORY_FILTERS } from '../lib/format';
import { distanceMeters, useGeolocation, type Coords } from '../lib/geo';
import type { CategoryFilter, Person } from '../types';

const MapView = lazy(() => import('../components/MapView'));

const DEFAULT_CENTER: Coords = { lat: 55.6905, lng: 12.5494 };

export function MapPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focusId = params.get('focus') ? Number(params.get('focus')) : null;
  const focusLat = Number(params.get('lat'));
  const focusLng = Number(params.get('lng'));
  const hasFocus = Number.isFinite(focusLat) && Number.isFinite(focusLng) && params.has('lat');

  const { coords, locate } = useGeolocation(!hasFocus);
  const [persons, setPersons] = useState<Person[] | null>(null);
  const [filter, setFilter] = useState<CategoryFilter['id']>('all');
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selected, setSelected] = useState<Person[] | null>(null);
  const [view, setView] = useState<{ center: Coords; zoom: number }>(
    hasFocus
      ? { center: { lat: focusLat, lng: focusLng }, zoom: 17 }
      : { center: DEFAULT_CENTER, zoom: 15 },
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPersons().then((result) => {
      if (!cancelled) setPersons(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Jump to the user once, when their position first arrives.
  useEffect(() => {
    if (coords && !hasFocus) setView({ center: coords, zoom: 16 });
  }, [coords, hasFocus]);

  const filtered = useMemo(
    () => (persons ?? []).filter((p) => filter === 'all' || p.category === filter),
    [persons, filter],
  );

  const inView = useMemo(() => {
    const center = bounds?.center ?? view.center;
    return filtered
      .filter((p) => p.lat !== null && p.lng !== null)
      .filter(
        (p) =>
          !bounds ||
          ((p.lat as number) <= bounds.north &&
            (p.lat as number) >= bounds.south &&
            (p.lng as number) <= bounds.east &&
            (p.lng as number) >= bounds.west),
      )
      .map((p) => ({
        p,
        d: distanceMeters(center, { lat: p.lat as number, lng: p.lng as number }),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 25);
  }, [filtered, bounds, view.center]);

  return (
    <div className="map-screen">
      <div className="map-area">
        <Suspense fallback={<LoadingState label="Indlæser kort…" />}>
          <MapView
            persons={filtered}
            center={view.center}
            zoom={view.zoom}
            user={coords}
            focusId={selected?.[0]?.id ?? focusId}
            onSelect={setSelected}
            onMove={setBounds}
          />
        </Suspense>

        <form
          className="map-search-bar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          <span style={{ color: 'var(--stone-500)' }}>{Icons.search}</span>
          <input
            placeholder="Søg efter person eller kirkegård…"
            aria-label="Søg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="map-filters">
          {CATEGORY_FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              className={`map-filter-chip ${filter === f.id ? 'active' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="map-locate-btn"
          aria-label="Vis min placering"
          onClick={() => (coords ? setView({ center: coords, zoom: 16 }) : locate())}
        >
          {Icons.locate}
        </button>

        <div className="map-bottom-sheet">
          <div className="sheet-handle" />
          {selected ? (
            <>
              <div className="sheet-title-row">
                <div className="sheet-title">
                  {selected.length === 1
                    ? 'Valgt grav'
                    : `${selected[0]?.cemetery || 'Her'} · ${selected.length} grave`}
                </div>
                <button type="button" className="link-btn" onClick={() => setSelected(null)}>
                  Luk
                </button>
              </div>
              {selected.map((p) => (
                <PersonListItem key={p.id} person={p} />
              ))}
            </>
          ) : (
            <>
              <div className="sheet-title">
                {!persons
                  ? 'Indlæser…'
                  : inView.length > 0
                    ? `${inView.length} grave her`
                    : 'Ingen kendte grave i området'}
              </div>
              {inView.map(({ p }) => (
                <PersonListItem
                  key={p.id}
                  person={p}
                  distanceMeters={
                    coords
                      ? distanceMeters(coords, { lat: p.lat as number, lng: p.lng as number })
                      : null
                  }
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
