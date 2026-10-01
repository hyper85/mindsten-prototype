// Tiny app-wide toast: any component can call showToast(), <Toaster/> renders it.

const EVENT = 'mindsten:toast';

export function showToast(message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function onToast(handler: (message: string) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
