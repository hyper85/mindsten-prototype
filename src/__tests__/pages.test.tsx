import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../pages/HomePage';
import { MapPage } from '../pages/MapPage';
import { PersonPage } from '../pages/PersonPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ScannerPage } from '../pages/ScannerPage';
import { SearchPage } from '../pages/SearchPage';
import { SubmitPage } from '../pages/SubmitPage';
import { TimeWindowPage } from '../pages/TimeWindowPage';
import { OnboardingOverlay } from '../pages/OnboardingOverlay';

// Leaflet needs real layout; the list below the map is what we assert on.
vi.mock('../components/MapView', () => ({ default: () => <div data-testid="map" /> }));

function renderAtRoute(path: string, ui: React.ReactNode, routePattern: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePattern} element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('pages smoke tests', () => {
  it('HomePage explains the app and lists famous graves without location', async () => {
    renderAtRoute('/home', <HomePage />, '/home');
    expect(screen.getByRole('heading', { name: 'Hvem ligger her?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scan en gravsten/ })).toBeInTheDocument();
    expect(await screen.findByText('H.C. Andersen')).toBeInTheDocument();
    expect(screen.getByText('Kendte grave')).toBeInTheDocument();
    // jsdom has no geolocation, so the prompt explains how to turn it on.
    expect(screen.getByText('Hvem ligger begravet omkring dig?')).toBeInTheDocument();
    expect(screen.getByText(/Placering er slået fra/)).toBeInTheDocument();
    expect(await screen.findByText('Temaruter')).toBeInTheDocument();
  });

  it('ScannerPage shows the hint and a camera fallback', () => {
    renderAtRoute('/scanner', <ScannerPage />, '/scanner');
    expect(screen.getByText(/Placer gravstenen/i)).toBeInTheDocument();
    expect(screen.getByText(/Kameraet er ikke tilgængeligt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan gravsten' })).toBeInTheDocument();
    expect(screen.getByText(/Demo/)).toBeInTheDocument();
  });

  it('ScannerPage demo scan returns candidates', async () => {
    renderAtRoute('/scanner', <ScannerPage />, '/scanner');
    screen.getByRole('button', { name: 'Scan gravsten' }).click();
    expect(await screen.findByText(/Mulige personer/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getAllByText(/%$/).length).toBeGreaterThan(0);
  });

  it('PersonPage renders the stone, facts, era teaser and actions', async () => {
    renderAtRoute('/person/1', <PersonPage />, '/person/:id');
    expect(await screen.findByRole('heading', { name: 'H.C. Andersen' })).toBeInTheDocument();
    expect(screen.getByText(/· 70 år/)).toBeInTheDocument();
    expect(screen.getByText('Statsbankerotten')).toBeInTheDocument();
    expect(screen.getByText('Livet i årstal')).toBeInTheDocument();
    expect(screen.getByText('Vis vej')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gem/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('PersonPage shows not-found for unknown id', async () => {
    renderAtRoute('/person/9999', <PersonPage />, '/person/:id');
    expect(await screen.findByText(/ikke fundet/i)).toBeInTheDocument();
  });

  it('TimeWindowPage shows monarchs and events with ages', async () => {
    renderAtRoute('/person/1/time-window', <TimeWindowPage />, '/person/:id/time-window');
    expect(
      await screen.findByRole('heading', { name: 'Danmark i Guldalderen' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Frederik 6.')).toBeInTheDocument();
    expect(screen.getByText('Besteg tronen, da H.C. Andersen var 3 år')).toBeInTheDocument();
    expect(screen.getByText('Grundloven underskrives')).toBeInTheDocument();
    expect(screen.getByText('44 år')).toBeInTheDocument();
  });

  it('MapPage renders filters and graves in view', async () => {
    renderAtRoute('/map', <MapPage />, '/map');
    expect(screen.getByRole('button', { name: 'Alle' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('H.C. Andersen')).toBeInTheDocument();
  });

  it('SearchPage shows categories and finds persons without diacritics', async () => {
    renderAtRoute('/search', <SearchPage />, '/search');
    expect(screen.getByRole('button', { name: /Forfattere/ })).toBeInTheDocument();
  });

  it('SearchPage finds persons without diacritics', async () => {
    renderAtRoute('/search?q=orsted', <SearchPage />, '/search');
    expect(await screen.findByText('H.C. Ørsted')).toBeInTheDocument();
  });

  it('SubmitPage renders the form', () => {
    renderAtRoute('/submit', <SubmitPage />, '/submit');
    expect(screen.getByLabelText('Navn på stenen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send forslag' })).toBeInTheDocument();
  });

  it('ProfilePage renders local stats and privacy actions', () => {
    renderAtRoute('/profile', <ProfilePage />, '/profile');
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByText('Scannet')).toBeInTheDocument();
    expect(screen.getByText('Eksportér mine data')).toBeInTheDocument();
  });

  it('OnboardingOverlay explains the app', () => {
    render(<OnboardingOverlay onDone={() => {}} />);
    expect(screen.getByRole('dialog', { name: /Velkommen til/ })).toBeInTheDocument();
    expect(screen.getByText('Scan en gravsten')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kom i gang' })).toBeInTheDocument();
  });
});

describe('storage', () => {
  it('toggles favorites', async () => {
    const { toggleFavorite, isFavorite } = await import('../lib/storage');
    expect(toggleFavorite(3)).toBe(true);
    expect(isFavorite(3)).toBe(true);
    expect(toggleFavorite(3)).toBe(false);
    await waitFor(() => expect(isFavorite(3)).toBe(false));
  });
});
