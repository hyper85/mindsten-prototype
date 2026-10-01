import { useCallback, useEffect, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type GeoStatus = 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable';

/** One-shot position lookup. Never throws; resolves null when unavailable. */
export function getCurrentPosition(timeoutMs = 8000): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function useGeolocation(auto = true) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus('ok');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { coords, status, locate };
}

/** Deep link that opens walking directions in the phone's map app. */
export function directionsUrl(lat: number, lng: number): string {
  const isApple =
    typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return isApple
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}
