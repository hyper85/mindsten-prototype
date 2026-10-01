import { useEffect } from 'react';

const DEFAULT_TITLE = 'MindSTEN — hver gravsten har en historie';

/** Sets the browser/tab title (also used by screen readers and share sheets). */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · MindSTEN` : DEFAULT_TITLE;
  }, [title]);
}
