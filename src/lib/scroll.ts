import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const MAX_WAIT_MS = 1500;

/**
 * Native-app scrolling for the single scroll container: a new screen starts at the top,
 * "back" returns to where you were. Query-string updates (e.g. typing a search) don't scroll.
 */
export function useScrollRestoration(ref: RefObject<HTMLElement | null>): void {
  const { key, pathname } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  const current = useRef({ key, pathname });
  const restoring = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => positions.current.set(current.current.key, el.scrollTop);
    // The visitor scrolling themselves wins over a pending restore.
    const stopRestore = () => cancelAnimationFrame(restoring.current);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', stopRestore, { passive: true });
    el.addEventListener('wheel', stopRestore, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', stopRestore);
      el.removeEventListener('wheel', stopRestore);
      stopRestore();
    };
  }, [ref]);

  // Layout effect: switch keys before the browser reports scroll events for the new screen.
  useLayoutEffect(() => {
    const previous = current.current;
    current.current = { key, pathname };
    const el = ref.current;
    if (!el || previous.key === key) return;
    if (navigationType === 'REPLACE' && previous.pathname === pathname) {
      // Same screen, new URL state: keep position (and any restore still in progress).
      positions.current.set(key, positions.current.get(previous.key) ?? el.scrollTop);
      return;
    }
    cancelAnimationFrame(restoring.current);
    const target = navigationType === 'POP' ? positions.current.get(key) : undefined;
    if (!target) {
      el.scrollTop = 0;
      return;
    }
    // The screen may still be loading its data; retry until it's tall enough.
    const started = performance.now();
    const restore = () => {
      el.scrollTop = target;
      if (Math.abs(el.scrollTop - target) > 1 && performance.now() - started < MAX_WAIT_MS) {
        restoring.current = requestAnimationFrame(restore);
      }
    };
    restore();
  }, [key, pathname, navigationType, ref]);
}
