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
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="state-panel">
      <div className="state-panel-title">{title}</div>
      {description && <div className="state-panel-text">{description}</div>}
      {actionLabel && onAction && (
        <button className="state-panel-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
