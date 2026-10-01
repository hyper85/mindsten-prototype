import { registerSW } from 'virtual:pwa-register';

const HOUR_MS = 60 * 60 * 1000;
// A reload right after opening the app costs the visitor nothing.
const FRESH_LOAD_MS = 15_000;

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
