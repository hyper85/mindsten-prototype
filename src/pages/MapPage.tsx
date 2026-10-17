import { LocateFixed, Search, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { List } from '../components/List';
import type { MapBounds } from '../components/MapView';
import { PersonRow } from '../components/PersonRow';
import { LoadingState } from '../components/StatePanel';
import { discoverNearby, getPersons } from '../lib/api';
import { CATEGORY_FILTERS } from '../lib/format';
import { distanceMeters, useGeolocation, type Coords } from '../lib/geo';
import { isSupabaseConfigured } from '../lib/supabase';
import { showToast } from '../lib/toast';
import type { CategoryFilter, Person } from '../types';
import { useDocumentTitle } from '../lib/title';

const MapView = lazy(() => import('../components/MapView'));

const DEFAULT_CENTER: Coords = { lat: 55.6905, lng: 12.5494 };
/** How far the sheet looks for "Nærmeste kendte grave" when the view is empty. */
const NEAREST_MAX_M = 50_000;

function nearestDistance(persons: Person[], from: Coords): number | null {
  let best: number | null = null;
  for (const p of persons) {
    if (p.lat === null || p.lng === null) continue;
    const d = distanceMeters(from, { lat: p.lat, lng: p.lng });
    if (best === null || d < best) best = d;
  }
  return best;
}

/**
 * Zoom level at which a grave `distanceM` from the centre is still on screen: the map
 * shows about 200 px from the centre to the nearest edge above the sheet, and a pixel
 * covers 156543 · cos(lat) / 2^zoom metres (Web Mercator).
 */
function zoomToInclude(distanceM: number | null, lat: number): number {
  if (distanceM === null || distanceM <= 300) return 16;
  const metresPerPx = distanceM / 200;
  const zoom = Math.floor(Math.log2((156_543 * Math.cos((lat * Math.PI) / 180)) / metresPerPx));
  return Math.min(16, Math.max(10, zoom));
}

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
  const [discovering, setDiscovering] = useState(false);

  useDocumentTitle('Kort');
  useEffect(() => {
    let cancelled = false;
    getPersons().then((result) => !cancelled && setPersons(result));
    return () => {
      cancelled = true;
    };
  }, []);

  // Jump to the visitor once their position and the persons have arrived, zoomed so the
  // nearest known grave is on screen (a street-level view of a spot with no graves helps
  // nobody). Done once; later pans and zooms are the visitor's.
  const jumped = useRef(false);
  useEffect(() => {
    if (!coords || hasFocus || !persons || jumped.current) return;
    jumped.current = true;
    setView({
      center: coords,
      zoom: zoomToInclude(nearestDistance(persons, coords), coords.lat),
    });
  }, [coords, hasFocus, persons]);

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

  /** Looks up notable graves around the map centre on Wikidata and adds them to the map. */
  const discoverHere = async () => {
    if (discovering) return;
    setDiscovering(true);
    try {
      const center = bounds?.center ?? view.center;
      const result = await discoverNearby(center, { force: true });
      const before = persons?.length ?? 0;
      const refreshed = await getPersons();
      setPersons(refreshed);
      const added = Math.max(result.added, refreshed.length - before);
      if (result.status === 'skipped' && added === 0) {
        showToast('Søgningen lykkedes ikke. Prøv igen om lidt.');
      } else if (added > 0) {
        showToast(added === 1 ? '1 ny grav fundet' : `${added} nye grave fundet`);
      } else {
        showToast('Ingen nye kendte grave inden for 25 km');
      }
    } finally {
      setDiscovering(false);
    }
  };

  // Nothing in view: list the nearest known graves instead of an empty sheet.
  const nearest = useMemo(() => {
    if (inView.length > 0) return [];
    const center = bounds?.center ?? view.center;
    return filtered
      .filter((p) => p.lat !== null && p.lng !== null)
      .map((p) => ({
        p,
        d: distanceMeters(center, { lat: p.lat as number, lng: p.lng as number }),
      }))
      .filter(({ d }) => d <= NEAREST_MAX_M)
      .sort((a, b) => a.d - b.d)
      .slice(0, 10)
      .map(({ p }) => p);
  }, [filtered, inView.length, bounds, view.center]);

  const sheetHeight = expanded ? '78%' : '38%';
  const shown = selected ?? (inView.length > 0 ? inView.map(({ p }) => p) : nearest);
  const title = selected
    ? selected.length === 1
      ? 'Valgt grav'
      : `${selected[0]?.cemetery || 'Her'} · ${selected.length} grave`
    : !persons
      ? 'Indlæser…'
      : inView.length > 0
        ? `${inView.length} ${inView.length === 1 ? 'grav' : 'grave'} her`
        : nearest.length > 0
          ? 'Nærmeste kendte grave'
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

      <div className="map-actions" style={{ bottom: `calc(${sheetHeight} + 12px)` }}>
        {isSupabaseConfigured && (
          <button
            type="button"
            className="map-discover"
            onClick={discoverHere}
            disabled={discovering}
            aria-busy={discovering}
          >
            {discovering ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            {discovering ? 'Søger…' : 'Find kendte grave her'}
          </button>
        )}
        <button
          type="button"
          className="map-fab"
          aria-label="Vis min placering"
          onClick={() => (coords ? setView({ center: coords, zoom: 16 }) : locate())}
        >
          <LocateFixed aria-hidden="true" />
        </button>
      </div>

      <div className="map-sheet" style={{ height: sheetHeight }}>
        <div className="map-sheet-head">
          <button
            type="button"
            className="grabber"
            aria-label="Vis hele listen"
            aria-expanded={expanded}
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
                    p.lat !== null && p.lng !== null
                      ? distanceMeters(coords ?? bounds?.center ?? view.center, {
                          lat: p.lat,
                          lng: p.lng,
                        })
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
