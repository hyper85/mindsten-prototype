import { LocateFixed, Search } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { List } from '../components/List';
import type { MapBounds } from '../components/MapView';
import { PersonRow } from '../components/PersonRow';
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
  const hasFocus = params.has('lat') && Number.isFinite(focusLat) && Number.isFinite(focusLng);

  const { coords, locate } = useGeolocation({ autoIfGranted: !hasFocus });
  const [persons, setPersons] = useState<Person[] | null>(null);
  const [filter, setFilter] = useState<CategoryFilter['id']>('all');
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selected, setSelected] = useState<Person[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<{ center: Coords; zoom: number }>(
    hasFocus
      ? { center: { lat: focusLat, lng: focusLng }, zoom: 17 }
      : { center: DEFAULT_CENTER, zoom: 15 },
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPersons().then((result) => !cancelled && setPersons(result));
    return () => {
      cancelled = true;
    };
  }, []);

  // Jump to the visitor once their position arrives.
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
      .slice(0, 30);
  }, [filtered, bounds, view.center]);

  const sheetHeight = expanded ? '78%' : '38%';
  const shown = selected ?? inView.map(({ p }) => p);
  const title = selected
    ? selected.length === 1
      ? 'Valgt grav'
      : `${selected[0]?.cemetery || 'Her'} · ${selected.length} grave`
    : !persons
      ? 'Indlæser…'
      : inView.length > 0
        ? `${inView.length} ${inView.length === 1 ? 'grav' : 'grave'} her`
        : 'Ingen kendte grave her';

  return (
    <div className="map-page">
      <Suspense fallback={<LoadingState label="Indlæser kort…" />}>
        <MapView
          persons={filtered}
          center={view.center}
          zoom={view.zoom}
          user={coords}
          focusId={selected?.[0]?.id ?? focusId}
          onSelect={(group) => {
            setSelected(group);
            setExpanded(false);
          }}
          onMove={setBounds}
        />
      </Suspense>

      <div className="map-top">
        <form
          className="map-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          <Search aria-hidden="true" />
          <input
            placeholder="Søg efter person eller kirkegård"
            aria-label="Søg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="chips">
          {CATEGORY_FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              className="chip"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setSelected(null);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="map-fab"
        style={{ bottom: `calc(${sheetHeight} + 12px)` }}
        aria-label="Vis min placering"
        onClick={() => (coords ? setView({ center: coords, zoom: 16 }) : locate())}
      >
        <LocateFixed aria-hidden="true" />
      </button>

      <div className="map-sheet" style={{ height: sheetHeight }}>
        <div className="map-sheet-head">
          <button
            type="button"
            className="grabber"
            aria-label={expanded ? 'Gør listen mindre' : 'Gør listen større'}
            onClick={() => setExpanded(!expanded)}
          />
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2 className="sheet-title">{title}</h2>
            {selected && (
              <button type="button" className="section-action" onClick={() => setSelected(null)}>
                Vis alle
              </button>
            )}
          </div>
        </div>
        <div className="map-sheet-scroll">
          {shown.length > 0 && (
            <List inset={72}>
              {shown.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  distanceMeters={
                    coords && p.lat !== null && p.lng !== null
                      ? distanceMeters(coords, { lat: p.lat, lng: p.lng })
                      : null
                  }
                />
              ))}
            </List>
          )}
        </div>
      </div>
    </div>
  );
}
