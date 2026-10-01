import { Camera, House, Map as MapIcon, Search, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS: Array<{ path: string; label: string; icon: LucideIcon }> = [
  { path: '/home', label: 'Hjem', icon: House },
  { path: '/map', label: 'Kort', icon: MapIcon },
  { path: '/search', label: 'Søg', icon: Search },
  { path: '/profile', label: 'Profil', icon: User },
];

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (prefix: string) =>
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`) ||
    (prefix === '/home' && pathname === '/');

  const tab = ({ path, label, icon: Icon }: (typeof TABS)[number]) => (
    <button
      key={path}
      type="button"
      className="tab"
      aria-current={isActive(path) ? 'page' : undefined}
      onClick={() => navigate(path)}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="tabbar" aria-label="Primær navigation">
      {TABS.slice(0, 2).map(tab)}
      <button
        type="button"
        className="tab is-scan"
        aria-label="Scan gravsten"
        onClick={() => navigate('/scanner')}
      >
        <span className="tab-scan-icon">
          <Camera aria-hidden="true" />
        </span>
        <span aria-hidden="true">Scan</span>
      </button>
      {TABS.slice(2).map(tab)}
    </nav>
  );
}
