import { WifiOff } from 'lucide-react';
import { useOnline } from '../lib/media';

/** A quiet bar while the phone has no connection (common at cemeteries). */
export function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-bar" role="status">
      <WifiOff aria-hidden="true" />
      Offline – viser gemte data
    </div>
  );
}
