import { Icons } from '../components/Icons';

export function ProfilePage() {
  return (
    <div className="my-profile-screen">
      <div className="my-profile-header">
        <div className="my-avatar">🪦</div>
        <div className="my-name">Historisk Nysgerrig</div>
        <div className="my-since">Medlem siden marts 2026</div>
      </div>

      <div className="stat-grid">
        <div className="stat-item">
          <div className="stat-num">23</div>
          <div className="stat-label">Scannet</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">7</div>
          <div className="stat-label">Tidsvinduer</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">3</div>
          <div className="stat-label">Ruter</div>
        </div>
      </div>

      <div className="settings-group">
        <div className="section-label">Indstillinger</div>
        <div className="settings-item">
          <div className="settings-icon green">{Icons.shield}</div>
          <div>
            <div className="settings-text">Privatliv & GDPR</div>
            <div className="settings-sub">Eksporter data · Slet konto</div>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-icon gold">{Icons.settings}</div>
          <div>
            <div className="settings-text">Generelt</div>
            <div className="settings-sub">Sprog · Offline · Notifikationer</div>
          </div>
        </div>
        <div className="settings-item">
          <div className="settings-icon green">{Icons.institution}</div>
          <div>
            <div className="settings-text">Institutioner</div>
            <div className="settings-sub">Lærer-portal · Kurator-adgang</div>
          </div>
        </div>
      </div>
    </div>
  );
}
