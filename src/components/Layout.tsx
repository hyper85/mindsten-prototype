import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function Page({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return <div className={`page ${flush ? 'is-flush' : ''}`}>{children}</div>;
}

interface LargeTitleProps {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}

export function LargeTitle({ title, eyebrow, subtitle, trailing }: LargeTitleProps) {
  return (
    <header className="large-title-block">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="large-title">{title}</h1>
        {subtitle && <div className="large-title-subtitle">{subtitle}</div>}
      </div>
      {trailing}
    </header>
  );
}

interface SectionProps {
  title?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, action, footer, children, className = '' }: SectionProps) {
  return (
    <section className={`section ${className}`}>
      {(title || action) && (
        <div className="section-header">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
      {footer && <div className="section-footer">{footer}</div>}
    </section>
  );
}

interface NavBarProps {
  /** Shown in the bar once the page has scrolled past its own title. */
  title?: string;
  backLabel?: string;
  /** Where "back" goes when there is no history (deep links). */
  fallback?: string;
  actions?: ReactNode;
  /** Always show the title (pages without a large title). */
  staticTitle?: boolean;
}

export function NavBar({
  title,
  backLabel = 'Tilbage',
  fallback = '/home',
  actions,
  staticTitle = false,
}: NavBarProps) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scroller = ref.current?.closest('.screen');
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > 56);
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };

  return (
    <div
      ref={ref}
      className={`navbar ${scrolled ? 'is-scrolled' : ''} ${staticTitle ? 'is-static' : ''}`}
    >
      <button type="button" className="navbar-back" onClick={back}>
        <ChevronLeft aria-hidden="true" />
        <span>{backLabel}</span>
      </button>
      <div className="navbar-title" aria-hidden={!scrolled && !staticTitle}>
        {title}
      </div>
      <div className="navbar-actions">{actions}</div>
    </div>
  );
}
