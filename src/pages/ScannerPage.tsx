import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { simulateScan } from '../lib/api';

type ScannerMode = 'camera' | 'QR' | 'søg';

const MODE_LABELS: Record<ScannerMode, string> = {
  camera: 'Kamera',
  QR: 'QR-kode',
  søg: 'Søg',
};

export function ScannerPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<ScannerMode>('camera');

  const handleScan = async () => {
    setScanning(true);
    try {
      const person = await simulateScan();
      if (person) {
        navigate(`/person/${person.id}`, { replace: true });
      } else {
        setScanning(false);
      }
    } catch (err) {
      console.error('Scan failed', err);
      setScanning(false);
    }
  };

  const modes: ScannerMode[] = ['camera', 'QR', 'søg'];

  return (
    <div className="scanner-screen">
      <div className="scanner-viewfinder">
        <div className="scanner-top-bar">
          <button
            type="button"
            className="scanner-icon-btn"
            aria-label="Tilbage"
            onClick={() => navigate(-1)}
          >
            {Icons.back}
          </button>
          <button type="button" className="scanner-icon-btn" aria-label="Blitz">
            {Icons.flash}
          </button>
        </div>
        <div className="scanner-bracket">
          <div className="scanner-bracket-inner" style={{ position: 'absolute', inset: 0 }} />
          <div className="scan-line" />
        </div>
        <div className="scanner-modes">
          {modes.map((m) => (
            <button
              type="button"
              key={m}
              className={`scanner-mode ${mode === m ? 'active' : ''}`}
              onClick={() => setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="scanner-hint">Placer gravstenen inden for rammen</div>
        <button type="button" className="sim-btn" onClick={handleScan} disabled={scanning}>
          Simuler scanning
        </button>
      </div>

      {scanning && (
        <div className="processing-overlay" role="status" aria-live="polite">
          <div className="spinner" />
          <div className="processing-text">Genkender tekst…</div>
          <div className="processing-sub">Matcher navn og lokation</div>
        </div>
      )}
    </div>
  );
}
