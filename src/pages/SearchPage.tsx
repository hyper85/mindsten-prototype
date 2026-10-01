import { Church, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORY_STYLE } from '../lib/categories';
import { LargeTitle, Page, Section } from '../components/Layout';
import { List, Row } from '../components/List';
import { PersonRow } from '../components/PersonRow';
import { EmptyState, LoadingState } from '../components/StatePanel';
import { getCemeteries, getPersons, searchPersons } from '../lib/api';
import { CATEGORY_META, PERSON_CATEGORIES } from '../lib/format';
import type { Cemetery, Person, PersonCategory } from '../types';

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function CemeteryRow({ cemetery }: { cemetery: Cemetery }) {
  return (
    <Row
      leading={
        <span className="icon-square" style={{ background: '#8a7d68' }}>
          <Church aria-hidden="true" />
        </span>
      }
      title={cemetery.name}
      subtitle={cemetery.city}
      to={`/cemetery/${cemetery.id}`}
    />
  );
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

  // Debounced search / category browse; keep the URL shareable.
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
          : await getPersons({ category: category ?? undefined, limit: 200 });
      if (!cancelled) setResults(category ? found.filter((p) => p.category === category) : found);
    }, 220);
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
    <Page>
      <LargeTitle title="Søg" />
      <div className="search-field">
        <Search aria-hidden="true" />
        <input
          type="search"
          placeholder="Navn, fx Karen Blixen"
          aria-label="Søg efter person eller kirkegård"
          value={query}
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            aria-label="Ryd søgning"
            onClick={() => setQuery('')}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      {category && (
        <div className="chips" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="chip"
            aria-pressed="true"
            onClick={() => setCategory(null)}
            aria-label={`Fjern filter ${CATEGORY_META[category].label}`}
          >
            {CATEGORY_META[category].label}
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      {browsing ? (
        <>
          <Section title="Gennemse">
            <div className="cat-grid">
              {PERSON_CATEGORIES.map((c) => {
                const { icon: Icon, color, soft } = CATEGORY_STYLE[c];
                return (
                  <button
                    key={c}
                    type="button"
                    className="cat-tile"
                    style={{ background: soft }}
                    onClick={() => setCategory(c)}
                  >
                    <Icon aria-hidden="true" style={{ color }} />
                    {CATEGORY_META[c].label}
                  </button>
                );
              })}
            </div>
          </Section>
          {cemeteries.length > 0 && (
            <Section title="Kirkegårde">
              <List inset={58}>
                {cemeteries.slice(0, 12).map((c) => (
                  <CemeteryRow key={c.id} cemetery={c} />
                ))}
              </List>
            </Section>
          )}
        </>
      ) : (
        <>
          {matchingCemeteries.length > 0 && (
            <Section title="Kirkegårde">
              <List inset={58}>
                {matchingCemeteries.map((c) => (
                  <CemeteryRow key={c.id} cemetery={c} />
                ))}
              </List>
            </Section>
          )}
          {!results ? (
            <LoadingState label="Søger…" />
          ) : results.length === 0 ? (
            <EmptyState
              title="Ingen resultater"
              description="Kender du graven? Tilføj den, så andre kan finde den."
              actionLabel="Tilføj en grav"
              onAction={() => navigate('/submit', { state: { prefill: { name: query } } })}
            />
          ) : (
            <Section title={`${results.length} ${results.length === 1 ? 'person' : 'personer'}`}>
              <List inset={72}>
                {results.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </List>
            </Section>
          )}
        </>
      )}
    </Page>
  );
}
