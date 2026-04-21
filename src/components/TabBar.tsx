import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  const homeActive = pathname === '/' || isActive('/home');

  return (
    <nav className="tab-bar" aria-label="Primær navigation">
      <button
        type="button"
        className={`tab-btn ${homeActive ? 'active' : ''}`}
        onClick={() => navigate('/home')}
      >
        {Icons.home}
        <span>Hjem</span>
      </button>
      <button
        type="button"
        className={`tab-btn ${isActive('/map') ? 'active' : ''}`}
        onClick={() => navigate('/map')}
      >
        {Icons.map}
        <span>Kort</span>
      </button>
      <button
        type="button"
        className="scan-tab-btn"
        aria-label="Scan gravsten"
        onClick={() => navigate('/scanner')}
      >
        {Icons.scan}
      </button>
      <button
        type="button"
        className={`tab-btn ${isActive('/profile') ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        {Icons.profile}
        <span>Profil</span>
      </button>
      <button type="button" className="tab-btn" style={{ opacity: 0.4 }} disabled>
        {Icons.more}
        <span>Mere</span>
      </button>
    </nav>
  );
}
