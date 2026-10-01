import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

const RELOAD_KEY = 'mindsten.chunk-reload';

/** A code chunk that no longer exists — the app was updated while this tab was open. */
function isStaleChunkError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[MindSTEN] Uncaught error:', error, info);
    if (isStaleChunkError(error)) {
      // Load the new version once; a second failure in a row is a real error (e.g. offline).
      try {
        if (window.sessionStorage.getItem(RELOAD_KEY) !== window.location.pathname) {
          window.sessionStorage.setItem(RELOAD_KEY, window.location.pathname);
          window.location.reload();
        }
      } catch {
        /* storage unavailable — show the error panel */
      }
    }
  }

  handleReset = (): void => {
    // A failed lazy import is cached by React, so retrying needs a fresh page.
    if (this.state.error && isStaleChunkError(this.state.error)) window.location.reload();
    else this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="state-panel" role="alert">
            <div className="state-panel-title">Noget gik galt</div>
            <div className="state-panel-text">
              Der opstod en uventet fejl. Prøv at genindlæse skærmen.
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={this.handleReset}>
              Prøv igen
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
