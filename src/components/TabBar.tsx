import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';

const TABS = [
  { path: '/home', label: 'Hjem', icon: Icons.home },
  { path: '/map', label: 'Kort', icon: Icons.map },
  { path: '/search', label: 'Søg', icon: Icons.search },
  { path: '/profile', label: 'Profil', icon: Icons.profile },
] as const;

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (prefix: string) =>
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`) ||
    (prefix === '/home' && pathname === '/');

  const tab = (t: (typeof TABS)[number]) => (
    <button
      key={t.path}
      type="button"
      className={`tab-btn ${isActive(t.path) ? 'active' : ''}`}
      aria-current={isActive(t.path) ? 'page' : undefined}
      onClick={() => navigate(t.path)}
    >
      {t.icon}
      <span>{t.label}</span>
    </button>
  );

  return (
    <nav className="tab-bar" aria-label="Primær navigation">
      {TABS.slice(0, 2).map(tab)}
      <button
        type="button"
        className="scan-tab-btn"
        aria-label="Scan gravsten"
        onClick={() => navigate('/scanner')}
      >
        {Icons.scan}
      </button>
      {TABS.slice(2).map(tab)}
    </nav>
  );
}
