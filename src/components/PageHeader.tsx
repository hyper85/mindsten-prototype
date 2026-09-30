import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';

interface Props {
  title: string;
  actions?: ReactNode;
  /** Where "back" goes when there is no history (deep links). */
  fallback?: string;
}

export function PageHeader({ title, actions, fallback = '/home' }: Props) {
  const navigate = useNavigate();
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
  return (
    <div className="profile-header">
      <button type="button" className="profile-back" aria-label="Tilbage" onClick={back}>
        {Icons.back}
      </button>
      <div className="profile-header-title">{title}</div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
