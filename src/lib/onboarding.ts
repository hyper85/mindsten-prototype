const STORAGE_KEY = 'mindsten.onboarded.v1';

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Shows the welcome screen again on next load (from Profile). */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}
