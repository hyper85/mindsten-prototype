import { Download, Info, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { LargeTitle, Page, Section } from '../components/Layout';
import { List, Row } from '../components/List';
import { PersonRow } from '../components/PersonRow';
import { getPersonsByIds } from '../lib/api';
import { resetOnboarding } from '../lib/onboarding';
import {
  clearLocalData,
  exportLocalData,
  getFavorites,
  getScanCount,
  getTimeWindowCount,
  getVisited,
} from '../lib/storage';
import { showToast } from '../lib/toast';
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

function SettingsIcon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="icon-square" style={{ background: color }} aria-hidden="true">
      {children}
    </span>
  );
}

export function ProfilePage() {
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
    showToast('Dine data er hentet');
  };

  return (
    <Page>
      <LargeTitle title="Profil" subtitle="Din historik ligger kun på denne telefon." />

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{stats.scans}</div>
          <div className="stat-label">Scannet</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.visited.length}</div>
          <div className="stat-label">Personer</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.timeWindows}</div>
          <div className="stat-label">Tidsvinduer</div>
        </div>
      </div>

      <Section title="Favoritter">
        {favorites.length > 0 ? (
          <List inset={72}>
            {favorites.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </List>
        ) : (
          <div className="card muted" style={{ fontSize: 15 }}>
            Tryk på hjertet hos en person for at gemme dem her.
          </div>
        )}
      </Section>

      {stats.visited.length > 0 && (
        <Section title="Senest set">
          <List>
            {stats.visited.slice(0, 5).map((v) => (
              <Row
                key={v.personId}
                title={v.name}
                trailing={new Date(v.at).toLocaleDateString('da-DK', {
                  day: 'numeric',
                  month: 'short',
                })}
                to={`/person/${v.personId}`}
              />
            ))}
          </List>
        </Section>
      )}

      <Section title="Bidrag">
        <List inset={58}>
          <Row
            leading={
              <SettingsIcon color="var(--tint)">
                <Plus />
              </SettingsIcon>
            }
            title="Tilføj en grav"
            subtitle="Foreslå en person, der mangler"
            to="/submit"
          />
        </List>
      </Section>

      <Section
        title="Privatliv"
        footer="MindSTEN kræver ingen konto. Historik, favoritter og statistik gemmes kun lokalt."
      >
        <List inset={58}>
          <Row
            leading={
              <SettingsIcon color="#2f6fdb">
                <Download />
              </SettingsIcon>
            }
            title="Eksportér mine data"
            onClick={download}
            chevron
          />
          <Row
            leading={
              <SettingsIcon color="#c8423b">
                <Trash2 />
              </SettingsIcon>
            }
            title={confirmDelete ? 'Tryk igen for at slette' : 'Slet mine data'}
            tone="danger"
            onClick={() => {
              if (confirmDelete) {
                clearLocalData();
                setConfirmDelete(false);
                showToast('Dine data er slettet');
              } else {
                setConfirmDelete(true);
              }
            }}
          />
        </List>
      </Section>

      <Section title="Om">
        <List inset={58}>
          <Row
            leading={
              <SettingsIcon color="#8a7d68">
                <Info />
              </SettingsIcon>
            }
            title="Om MindSTEN, kilder og privatliv"
            to="/about"
          />
          <Row
            leading={
              <SettingsIcon color="#8a4fd1">
                <RotateCcw />
              </SettingsIcon>
            }
            title="Vis introduktionen igen"
            onClick={() => {
              resetOnboarding();
              window.location.assign(import.meta.env.BASE_URL);
            }}
            chevron
          />
        </List>
      </Section>
    </Page>
  );
}
