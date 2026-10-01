import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { PersonListItem } from '../components/PersonListItem';
import { LoadingState } from '../components/StatePanel';
import { getCemeteries, getPersons, searchPersons } from '../lib/api';
import { CATEGORY_META, PERSON_CATEGORIES } from '../lib/format';
import type { Cemetery, Person, PersonCategory } from '../types';

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState<PersonCategory | null>(
    (params.get('kategori') as PersonCategory | null) ?? null,
  );
  const [results, setResults] = useState<Person[] | null>(null);
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);

  useEffect(() => {
    getCemeteries()
      .then(setCemeteries)
      .catch(() => setCemeteries([]));
  }, []);

  // Debounced search / category browse.
  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (category) next.set('kategori', category);
    setParams(next, { replace: true });

    if (q.length < 2 && !category) {
      setResults(null);
      return;
    }
    setResults(null);
    const handle = setTimeout(async () => {
      const found =
        q.length >= 2
          ? await searchPersons(q, 50)
          : await getPersons({ category: category ?? undefined, limit: 100 });
      if (!cancelled) setResults(category ? found.filter((p) => p.category === category) : found);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, category, setParams]);

  const matchingCemeteries = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    return cemeteries.filter((c) => normalize(`${c.name} ${c.city}`).includes(q)).slice(0, 5);
  }, [cemeteries, query]);

  const browsing = query.trim().length < 2 && !category;

  return (
    <div className="home-screen">
      <div className="greeting" style={{ marginTop: 8 }}>
        Søg
      </div>
      <div className="search-field">
        <span style={{ color: 'var(--stone-500)' }}>{Icons.search}</span>
        <input
          autoFocus
          type="search"
          placeholder="Navn, fx Karen Blixen"
          aria-label="Søg efter person eller kirkegård"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {PERSON_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`map-filter-chip ${category === c ? 'active' : ''}`}
            aria-pressed={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      {matchingCemeteries.length > 0 && (
        <>
          <div className="section-label">Kirkegårde</div>
          {matchingCemeteries.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              className="nearby-card"
              onClick={() => navigate(`/cemetery/${c.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/cemetery/${c.id}`)}
            >
              <div className="nearby-avatar">⛪</div>
              <div className="nearby-info">
                <div className="nearby-name">{c.name}</div>
                <div className="nearby-meta">{c.city}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {browsing ? (
        <>
          <div className="section-label">Kirkegårde med kendte grave</div>
          {cemeteries.slice(0, 12).map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              className="nearby-card"
              onClick={() => navigate(`/cemetery/${c.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/cemetery/${c.id}`)}
            >
              <div className="nearby-avatar">⛪</div>
              <div className="nearby-info">
                <div className="nearby-name">{c.name}</div>
                <div className="nearby-meta">{c.city}</div>
              </div>
            </div>
          ))}
        </>
      ) : !results ? (
        <LoadingState label="Søger…" />
      ) : results.length === 0 ? (
        <div className="state-panel">
          <div className="state-panel-title">Ingen resultater</div>
          <div className="state-panel-text">
            Kender du graven? Tilføj den, så andre kan finde den.
          </div>
          <button
            type="button"
            className="state-panel-action"
            onClick={() => navigate('/submit', { state: { prefill: { name: query } } })}
          >
            Tilføj en grav
          </button>
        </div>
      ) : (
        <>
          <div className="section-label">
            {results.length} {results.length === 1 ? 'person' : 'personer'}
          </div>
          {results.map((p) => (
            <PersonListItem key={p.id} person={p} />
          ))}
        </>
      )}
    </div>
  );
}
