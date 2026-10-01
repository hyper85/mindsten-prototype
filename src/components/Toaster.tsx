import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onToast } from '../lib/toast';

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onToast((m) => {
      setMessage(m);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2200);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <CircleCheck aria-hidden="true" />
      {message}
    </div>
  );
}
