import { ChevronRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ListProps {
  children: ReactNode;
  /** Left inset of the separators, e.g. 72 when rows start with a 44px avatar. */
  inset?: number;
  className?: string;
}

export function List({ children, inset, className = '' }: ListProps) {
  const style = inset ? ({ '--inset': `${inset}px` } as CSSProperties) : undefined;
  return (
    <div className={`list ${className}`} style={style}>
      {children}
    </div>
  );
}

interface RowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Show a disclosure chevron (default when the row navigates). */
  chevron?: boolean;
  to?: string;
  state?: unknown;
  href?: string;
  onClick?: () => void;
  tone?: 'default' | 'danger' | 'tint';
  wrap?: boolean;
  ariaLabel?: string;
}

export function Row({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  to,
  state,
  href,
  onClick,
  tone = 'default',
  wrap = false,
  ariaLabel,
}: RowProps) {
  const interactive = Boolean(to || href || onClick);
  const showChevron = chevron ?? Boolean(to);
  const content = (
    <>
      {leading && <span className="row-leading">{leading}</span>}
      <span className="row-body">
        <span
          className={`row-title ${wrap ? 'is-wrap' : ''} ${tone !== 'default' ? `is-${tone}` : ''}`}
          style={{ display: 'block' }}
        >
          {title}
        </span>
        {subtitle && (
          <span className={`row-subtitle ${wrap ? 'is-wrap' : ''}`} style={{ display: 'block' }}>
            {subtitle}
          </span>
        )}
      </span>
      {(trailing || (interactive && showChevron)) && (
        <span className="row-trailing">
          {trailing}
          {interactive && showChevron && (
            <ChevronRight className="row-chevron" aria-hidden="true" />
          )}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link className="row" to={to} state={state} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a className="row" href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="row" onClick={onClick} aria-label={ariaLabel}>
        {content}
      </button>
    );
  }
  return <div className="row">{content}</div>;
}

/** A label/value row, like the fact rows in Contacts. */
export function ValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className="row-value">{value}</span>
    </div>
  );
}
