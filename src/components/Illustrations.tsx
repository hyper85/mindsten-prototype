// Brand mark and small illustrations, drawn as inline SVG so they stay crisp
// and need no network requests.

import { useId } from 'react';

interface SvgProps {
  className?: string;
  title?: string;
}

/** App icon: a gravestone with a spark of light — history coming alive. */
export function AppMark({ className, title = 'MindSTEN' }: SvgProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d8a64" />
          <stop offset="1" stopColor="#245640" />
        </linearGradient>
        <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e0d4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill={`url(#${id}-bg)`} />
      <path d="M32 79V47a18 18 0 0 1 36 0v32z" fill={`url(#${id}-stone)`} />
      <rect x="41" y="52" width="18" height="3.4" rx="1.7" fill="#c9c1b2" />
      <rect x="44" y="59" width="12" height="3.4" rx="1.7" fill="#c9c1b2" />
      <rect x="42" y="68" width="16" height="3" rx="1.5" fill="#d8d1c4" />
      <rect x="24" y="78" width="52" height="5" rx="2.5" fill="#f5f3ee" opacity=".55" />
      <path d="M73 18l2.6 6.2 6.2 2.6-6.2 2.6L73 35.6l-2.6-6.2-6.2-2.6 6.2-2.6z" fill="#f2cf7a" />
    </svg>
  );
}

/** Home hero: a gravestone inside scan brackets. */
export function ScanIllustration({ className }: SvgProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e7e1d6" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="34" ry="5" fill="#2d6a4f" opacity=".12" />
      <path
        d="M36 102V54a24 24 0 0 1 48 0v48z"
        fill={`url(#${id}-stone)`}
        stroke="#d6cfc2"
        strokeWidth="1.5"
      />
      <rect x="47" y="55" width="26" height="4" rx="2" fill="#cdc5b6" />
      <rect x="51" y="64" width="18" height="4" rx="2" fill="#cdc5b6" />
      <rect x="49" y="78" width="22" height="3.2" rx="1.6" fill="#ddd6c9" />
      <rect x="53" y="86" width="14" height="3.2" rx="1.6" fill="#ddd6c9" />
      <g fill="none" stroke="#2d6a4f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 36V24h12" />
        <path d="M84 24h12v12" />
        <path d="M96 92v12H84" />
        <path d="M36 104H24V92" />
      </g>
      <path d="M100 6l2.2 5.3 5.3 2.2-5.3 2.2-2.2 5.3-2.2-5.3-5.3-2.2 5.3-2.2z" fill="#d9a63c" />
      <path d="M12 52l1.4 3.4 3.4 1.4-3.4 1.4L12 62l-1.4-3.4-3.4-1.4 3.4-1.4z" fill="#d9a63c" />
    </svg>
  );
}

/** A small laurel sprig carved into the stone. */
export function Ornament({ className }: SvgProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <g fill="currentColor" opacity=".9">
        <ellipse cx="8.6" cy="9.5" rx="3.1" ry="1.5" transform="rotate(35 8.6 9.5)" />
        <ellipse cx="15.4" cy="9.5" rx="3.1" ry="1.5" transform="rotate(-35 15.4 9.5)" />
        <ellipse cx="8.4" cy="14" rx="3.1" ry="1.5" transform="rotate(30 8.4 14)" />
        <ellipse cx="15.6" cy="14" rx="3.1" ry="1.5" transform="rotate(-30 15.6 14)" />
        <ellipse cx="12" cy="5" rx="1.4" ry="2.6" />
      </g>
    </svg>
  );
}
