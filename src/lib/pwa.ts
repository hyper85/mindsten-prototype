import { registerSW } from 'virtual:pwa-register';

const HOUR_MS = 60 * 60 * 1000;
// A reload right after opening the app costs the visitor nothing.
const FRESH_LOAD_MS = 15_000;

/** Build date and commit of the running app, e.g. "2026-10-16 · 4a82180". */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

const loadedAt = Date.now();
let updatePending = false;

/**
 * Registers the service worker and keeps the installed app current. Phones keep PWA tabs
 * alive for days, so we also check for a new version hourly and whenever the app returns
 * to the foreground. A new version is applied straight away if the app was just opened,
 * otherwise on the next navigation — never in the middle of a scan or a form.
 */
export function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onNeedReload() {
      updatePending = true;
      if (Date.now() - loadedAt < FRESH_LOAD_MS) window.location.reload();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      };
      setInterval(check, HOUR_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

/** Called on route changes: swaps in a downloaded update with a full page load. */
export function applyPendingUpdate(): void {
  if (updatePending) window.location.reload();
}

/**
 * Last resort when a phone keeps showing an old build: drop every service worker and
 * cache for this origin, then load the app fresh from the server. Local data
 * (favourites, history) lives in localStorage and is untouched.
 */
export async function forceUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* reload anyway */
  }
  // A cache-busting query makes sure the HTML itself is fetched from the server.
  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
}
