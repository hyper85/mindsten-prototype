import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[MindSTEN] Uncaught error:', error, info);
  }

  handleReset = (): void => {
    this.setState({ error: null });
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
            <button className="state-panel-action" onClick={this.handleReset}>
              Prøv igen
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
