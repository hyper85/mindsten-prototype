import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { LoadingState, EmptyState } from '../components/StatePanel';
import { getPersonById } from '../lib/api';
import type { Person } from '../types';

export function TimeWindowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'not-found'>('loading');

  useEffect(() => {
    let cancelled = false;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setStatus('not-found');
      return;
    }
    setStatus('loading');
    getPersonById(numericId).then((result) => {
      if (cancelled) return;
      if (!result) {
        setStatus('not-found');
      } else {
        setPerson(result);
        setStatus('ok');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="tw-screen">
        <LoadingState />
      </div>
    );
  }

  if (status === 'not-found' || !person) {
    return (
      <div className="tw-screen">
        <EmptyState
          title="Tidsvindue ikke tilgængeligt"
          actionLabel="Tilbage"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="tw-screen">
      <div className="profile-header">
        <button
          type="button"
          className="profile-back"
          aria-label="Tilbage"
          onClick={() => navigate(-1)}
        >
          {Icons.back}
        </button>
        <div className="profile-header-title">Tidsvindue</div>
      </div>

      <div className="tw-video-area">
        <div className="tw-era-badge">
          {person.eraYears} · {person.era}
        </div>
        <button type="button" className="tw-play-big" aria-label="Afspil tidsvindue">
          {Icons.play}
        </button>
      </div>

      <div className="tw-content">
        <div className="tw-content-title">{person.timeWindowTitle}</div>
        <div className="tw-context-cards">
          <div className="tw-context-card">
            <div className="tw-cc-label">Hvad skete der?</div>
            <div className="tw-cc-text">
              Danmark var i en turbulent periode. {person.name} levede i en tid med store
              forandringer — politisk, kulturelt og videnskabeligt.
            </div>
          </div>
          <div className="tw-context-card">
            <div className="tw-cc-label">Dagliglivet</div>
            <div className="tw-cc-text">
              København var en by i forvandling. Gaderne summede af ny energi mens Danmark fandt
              sin plads i verden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
