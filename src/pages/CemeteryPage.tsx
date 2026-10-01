import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { PersonListItem } from '../components/PersonListItem';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getCemeteryById, getPersons } from '../lib/api';
import { directionsUrl } from '../lib/geo';
import type { Cemetery, Person } from '../types';

export function CemeteryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cemetery, setCemetery] = useState<Cemetery | null | undefined>(undefined);
  const [persons, setPersons] = useState<Person[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cemeteryId = Number(id);
    Promise.all([getCemeteryById(cemeteryId), getPersons({ cemeteryId, limit: 500 })])
      .then(([c, p]) => {
        if (cancelled) return;
        setCemetery(c);
        setPersons(
          p.sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name, 'da')),
        );
      })
      .catch(() => !cancelled && setCemetery(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (cemetery === undefined) return <LoadingState />;
  if (cemetery === null) {
    return (
      <div className="profile-screen">
        <EmptyState
          title="Kirkegård ikke fundet"
          actionLabel="Til søgning"
          onAction={() => navigate('/search')}
        />
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <PageHeader title={cemetery.city} fallback="/search" />
      <div className="person-name-area">
        <h1 className="person-main-name">{cemetery.name}</h1>
        {cemetery.description && (
          <p className="bio-text" style={{ marginTop: 8 }}>
            {cemetery.description}
          </p>
        )}
      </div>
      <div className="grave-actions" style={{ padding: '16px 20px' }}>
        <a
          className="secondary-btn"
          href={directionsUrl(cemetery.lat, cemetery.lng)}
          target="_blank"
          rel="noreferrer"
        >
          {Icons.directions} Vis vej
        </a>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => navigate(`/map?lat=${cemetery.lat}&lng=${cemetery.lng}`)}
        >
          {Icons.map} Kort
        </button>
      </div>
      <div style={{ padding: '0 20px' }}>
        <div className="section-label">
          {persons ? `${persons.length} kendte grave` : 'Kendte grave'}
        </div>
        {!persons ? <LoadingState /> : persons.map((p) => <PersonListItem key={p.id} person={p} />)}
      </div>
    </div>
  );
}
