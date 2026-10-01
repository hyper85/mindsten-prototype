// Per-device user data (no account needed). Everything lives in localStorage
// so nothing personal leaves the phone — see the privacy section on /profile.

const KEYS = {
  visited: 'mindsten.visited.v1',
  favorites: 'mindsten.favorites.v1',
  scans: 'mindsten.scans.v1',
  timeWindows: 'mindsten.timewindows.v1',
} as const;

export interface VisitEntry {
  personId: number;
  name: string;
  at: string; // ISO timestamp
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('mindsten:storage'));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function getVisited(): VisitEntry[] {
  return read<VisitEntry[]>(KEYS.visited, []);
}

export function recordVisit(personId: number, name: string): void {
  const rest = getVisited().filter((v) => v.personId !== personId);
  write(KEYS.visited, [{ personId, name, at: new Date().toISOString() }, ...rest].slice(0, 200));
}

export function getFavorites(): number[] {
  return read<number[]>(KEYS.favorites, []);
}

export function isFavorite(personId: number): boolean {
  return getFavorites().includes(personId);
}

export function toggleFavorite(personId: number): boolean {
  const favs = getFavorites();
  const next = favs.includes(personId) ? favs.filter((id) => id !== personId) : [personId, ...favs];
  write(KEYS.favorites, next);
  return next.includes(personId);
}

export function getScanCount(): number {
  return read<number>(KEYS.scans, 0);
}

export function incrementScanCount(): void {
  write(KEYS.scans, getScanCount() + 1);
}

export function getTimeWindowCount(): number {
  return read<number[]>(KEYS.timeWindows, []).length;
}

export function recordTimeWindow(personId: number): void {
  const seen = read<number[]>(KEYS.timeWindows, []);
  if (!seen.includes(personId)) write(KEYS.timeWindows, [...seen, personId]);
}

/** GDPR: export everything this device knows about the user. */
export function exportLocalData(): string {
  const data: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(KEYS)) data[name] = read(key, null);
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
}

/** GDPR: forget everything. */
export function clearLocalData(): void {
  try {
    for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
    window.localStorage.removeItem('mindsten.onboarded.v1');
    // AI-guide conversations and the last scan live in sessionStorage.
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith('mindsten.')) window.sessionStorage.removeItem(key);
    }
    window.dispatchEvent(new Event('mindsten:storage'));
  } catch {
    /* ignore */
  }
}
