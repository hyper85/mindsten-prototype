import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { PersonListItem } from '../components/PersonListItem';
import { getPersonsByIds } from '../lib/api';
import {
  clearLocalData,
  exportLocalData,
  getFavorites,
  getScanCount,
  getTimeWindowCount,
  getVisited,
} from '../lib/storage';
import type { Person } from '../types';

const readStats = () => ({
  scans: getScanCount(),
  timeWindows: getTimeWindowCount(),
  visited: getVisited(),
  favorites: getFavorites(),
});

function useLocalStats() {
  const [stats, setStats] = useState(readStats);
  useEffect(() => {
    const update = () => setStats(readStats());
    window.addEventListener('mindsten:storage', update);
    return () => window.removeEventListener('mindsten:storage', update);
  }, []);
  return stats;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const stats = useLocalStats();
  const [favorites, setFavorites] = useState<Person[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPersonsByIds(stats.favorites.slice(0, 20)).then((p) => !cancelled && setFavorites(p));
    return () => {
      cancelled = true;
    };
  }, [stats.favorites]);

  const download = () => {
    const blob = new Blob([exportLocalData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindsten-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-profile-screen">
      <div className="my-profile-header">
        <div className="my-avatar">🪦</div>
        <div className="my-name">Historisk Nysgerrig</div>
        <div className="my-since">Dine data bliver på denne telefon</div>
      </div>

      <div className="stat-grid">
        <div className="stat-item">
          <div className="stat-num">{stats.scans}</div>
          <div className="stat-label">Scannet</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{stats.visited.length}</div>
          <div className="stat-label">Personer</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{stats.timeWindows}</div>
          <div className="stat-label">Tidsvinduer</div>
        </div>
      </div>

      {favorites.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 20 }}>
            Favoritter
          </div>
          {favorites.map((p) => (
            <PersonListItem key={p.id} person={p} />
          ))}
        </>
      )}

      {stats.visited.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 20 }}>
            Senest set
          </div>
          {stats.visited.slice(0, 5).map((v) => (
            <button
              key={v.personId}
              type="button"
              className="history-row"
              onClick={() => navigate(`/person/${v.personId}`)}
            >
              <span>{v.name}</span>
              <span className="muted">{new Date(v.at).toLocaleDateString('da-DK')}</span>
            </button>
          ))}
        </>
      )}

      <div className="settings-group">
        <div className="section-label">Bidrag</div>
        <button type="button" className="settings-item" onClick={() => navigate('/submit')}>
          <div className="settings-icon gold">{Icons.plus}</div>
          <div>
            <div className="settings-text">Tilføj en grav</div>
            <div className="settings-sub">Foreslå en person, der mangler</div>
          </div>
        </button>

        <div className="section-label" style={{ marginTop: 20 }}>
          Privatliv & GDPR
        </div>
        <button type="button" className="settings-item" onClick={download}>
          <div className="settings-icon green">{Icons.shield}</div>
          <div>
            <div className="settings-text">Eksportér mine data</div>
            <div className="settings-sub">Hent alt, appen har gemt om dig (JSON)</div>
          </div>
        </button>
        <button
          type="button"
          className="settings-item"
          onClick={() => {
            if (confirmDelete) {
              clearLocalData();
              setConfirmDelete(false);
            } else {
              setConfirmDelete(true);
            }
          }}
        >
          <div className="settings-icon gold">{Icons.close}</div>
          <div>
            <div className="settings-text">
              {confirmDelete ? 'Tryk igen for at slette' : 'Slet mine data'}
            </div>
            <div className="settings-sub">Historik, favoritter og statistik på denne enhed</div>
          </div>
        </button>
        <button type="button" className="settings-item" onClick={() => navigate('/about')}>
          <div className="settings-icon green">{Icons.source}</div>
          <div>
            <div className="settings-text">Om MindSTEN, kilder & privatliv</div>
            <div className="settings-sub">Hvor data kommer fra, og hvordan vi behandler dem</div>
          </div>
        </button>
      </div>
    </div>
  );
}
