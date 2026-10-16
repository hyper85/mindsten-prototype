import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PERSONS } from '../data/persons';
import { suggestedQuestions } from '../lib/ask';
import { countryName, languageName } from '../lib/format';
import { mapPerson, type PersonRow } from '../lib/mappers';
import { PersonPage } from '../pages/PersonPage';
import { TimeWindowPage } from '../pages/TimeWindowPage';

/** A grave discovered abroad, as the backend returns it after enrichment. */
const CHAPLIN_ROW: PersonRow = {
  id: 9001,
  name: 'Charlie Chaplin',
  born: null,
  died: null,
  birth_date: '1889-04-16',
  death_date: '1977-12-25',
  birth_year: 1889,
  death_year: 1977,
  birth_place: 'London',
  death_place: 'Corsier-sur-Vevey',
  profession: 'Skuespiller og filminstruktør',
  cemetery: 'Cimetière de Corsier-sur-Vevey',
  cemetery_id: null,
  city: 'Corsier-sur-Vevey',
  lat: 46.4733,
  lng: 6.8369,
  location_precision: 'cemetery',
  confidence: 80,
  short_bio: 'Sir Charles Spencer Chaplin was an English comic actor and filmmaker.',
  full_bio: null,
  era: null,
  era_years: null,
  time_window_title: null,
  category: 'stage',
  image_url: null,
  image_credit: null,
  wikidata_id: 'Q882',
  wikipedia_url: 'https://en.wikipedia.org/wiki/Charlie_Chaplin',
  country_code: 'CH',
  bio_lang: 'en',
  enriched_at: '2026-10-01T10:00:00Z',
  timeline_events: [],
  person_sources: [{ label: 'Wikipedia (engelsk)', url: null, sort_order: 0 }],
};

const CHAPLIN = mapPerson(CHAPLIN_ROW);

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    getPersonById: vi.fn(async (id: number) =>
      id === CHAPLIN_ROW.id ? mapPerson(CHAPLIN_ROW) : actual.getPersonById(id),
    ),
    getEraStory: vi.fn(async () => null),
  };
});

function renderAtRoute(path: string, ui: React.ReactNode, routePattern: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePattern} element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('persons outside Denmark', () => {
  it('maps country, bio language, enrichment and region', () => {
    expect(CHAPLIN.countryCode).toBe('CH');
    expect(CHAPLIN.bioLang).toBe('en');
    expect(CHAPLIN.enriched).toBe(true);
    expect(CHAPLIN.region).toBe('world');
    expect(CHAPLIN.era).toBe('1900-tallet');
    expect(CHAPLIN.timeWindowTitle).toBe('Verden i Charlie Chaplins tid');

    const pending = mapPerson({ ...CHAPLIN_ROW, enriched_at: null, bio_lang: null });
    expect(pending.enriched).toBe(false);
    expect(pending.bioLang).toBeNull();

    // Legacy rows without a country are Danish; curated fixtures are already enriched.
    expect(mapPerson({ ...CHAPLIN_ROW, country_code: null }).region).toBe('dk');
    expect(mapPerson({ ...CHAPLIN_ROW, country_code: 'DK', enriched_at: undefined })).toMatchObject(
      { region: 'dk', enriched: true },
    );
    expect(PERSONS[0]).toMatchObject({ countryCode: 'DK', bioLang: 'da', region: 'dk' });
  });

  it('names countries and languages in Danish', () => {
    expect(countryName('CH')).toBe('Schweiz');
    expect(languageName('en')).toBe('engelsk');
    expect(countryName('XQ')).toBe('XQ');
    expect(countryName(null)).toBe('');
  });

  it('suggests world questions, a Danish summary first for a foreign bio', () => {
    expect(suggestedQuestions(CHAPLIN)).toEqual([
      'Fortæl kort om Charlie Chaplin på dansk',
      'Hvorfor er Charlie Chaplin kendt?',
      'Hvad er Charlie Chaplin kendt for på scenen og filmen?',
      'Hvordan var hverdagen i 1900-tallet?',
      'Hvad skete der i verden i Charlie Chaplins levetid?',
    ]);
    const statesman = { ...CHAPLIN, category: 'politics' as const, bioLang: 'da' };
    expect(suggestedQuestions(statesman)[1]).toBe('Hvad betød Charlie Chaplin for sit land?');
  });

  it('TimeWindowPage shows world events only', async () => {
    renderAtRoute('/person/9001/time-window', <TimeWindowPage />, '/person/:id/time-window');
    expect(
      await screen.findByRole('heading', { name: 'Verden i Charlie Chaplins tid' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Anden Verdenskrig slutter')).toBeInTheDocument();
    expect(screen.getByText(/Charlie Chaplin levede i 1900-tallet/)).toBeInTheDocument();
    expect(screen.queryByText(/Regent/)).not.toBeInTheDocument();
    expect(screen.queryByText('Danmark i tal')).not.toBeInTheDocument();
    expect(screen.queryByText('Hverdagen')).not.toBeInTheDocument();
    expect(screen.queryByText('Kun Danmark')).not.toBeInTheDocument();
    expect(screen.queryByText('Befrielsen')).not.toBeInTheDocument();
  });

  it('PersonPage shows the country and the bio language', async () => {
    renderAtRoute('/person/9001', <PersonPage />, '/person/:id');
    expect(await screen.findByRole('heading', { name: 'Charlie Chaplin' })).toBeInTheDocument();
    expect(
      screen.getByText('Cimetière de Corsier-sur-Vevey, Corsier-sur-Vevey, Schweiz'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Biografi fra engelsk Wikipedia – AI-guiden svarer på dansk.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Fortæl kort om Charlie Chaplin på dansk/ }),
    ).toBeInTheDocument();
  });
});
