import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { Coords } from '../lib/geo';
import type { Person } from '../types';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  center: Coords;
}

interface Props {
  persons: Person[];
  center: Coords;
  zoom: number;
  user: Coords | null;
  focusId?: number | null;
  /** Called with all persons at the tapped spot (several share cemetery coordinates). */
  onSelect: (persons: Person[]) => void;
  onMove?: (bounds: MapBounds) => void;
}

interface Group {
  key: string;
  lat: number;
  lng: number;
  persons: Person[];
}

/** Persons with identical coordinates (cemetery-level precision) share one marker. */
function groupByPosition(persons: Person[]): Group[] {
  const groups = new Map<string, Group>();
  for (const p of persons) {
    if (p.lat === null || p.lng === null) continue;
    const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
    const g = groups.get(key);
    if (g) g.persons.push(p);
    else groups.set(key, { key, lat: p.lat, lng: p.lng, persons: [p] });
  }
  return [...groups.values()];
}

function Recenter({ center, zoom }: { center: Coords; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

function BoundsReporter({ onMove }: { onMove?: (b: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => report(),
  });
  const report = () => {
    if (!onMove) return;
    const b = map.getBounds();
    const c = map.getCenter();
    onMove({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
      center: { lat: c.lat, lng: c.lng },
    });
  };
  useEffect(() => {
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function MapView({ persons, center, zoom, user, focusId, onSelect, onMove }: Props) {
  const groups = useMemo(() => groupByPosition(persons), [persons]);

  return (
    <MapContainer
      className="leaflet-map"
      center={[center.lat, center.lng]}
      zoom={zoom}
      preferCanvas
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url={import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
        maxZoom={19}
      />
      <Recenter center={center} zoom={zoom} />
      <BoundsReporter onMove={onMove} />
      {groups.map((g) => {
        const focused = g.persons.some((p) => p.id === focusId);
        const count = g.persons.length;
        const highlight = g.persons.some((p) => p.confidence >= 85);
        return (
          <CircleMarker
            key={g.key}
            center={[g.lat, g.lng]}
            radius={Math.min(7 + Math.sqrt(count) * 3, 22) + (focused ? 3 : 0)}
            pathOptions={{
              color: focused ? '#EBD9A5' : '#0F0E0D',
              weight: 2,
              fillColor: highlight ? '#C9A84C' : '#6B9E73',
              fillOpacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelect(g.persons) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {count === 1
                ? g.persons[0].name
                : `${g.persons[0].cemetery || 'Grave'} · ${count} personer`}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {user && (
        <CircleMarker
          center={[user.lat, user.lng]}
          radius={8}
          pathOptions={{ color: '#fff', weight: 3, fillColor: '#4A90E2', fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
