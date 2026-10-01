import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Indlæser…' }: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <div className="spinner" />
      <div className="state-panel-text">{label}</div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="state-panel">
      <span className="icon-circle" aria-hidden="true">
        {icon ?? <SearchX />}
      </span>
      <div className="state-panel-title">{title}</div>
      {description && <div className="state-panel-text">{description}</div>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
