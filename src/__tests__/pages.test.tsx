import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../pages/HomePage';
import { MapPage } from '../pages/MapPage';
import { PersonPage } from '../pages/PersonPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ScannerPage } from '../pages/ScannerPage';
import { TimeWindowPage } from '../pages/TimeWindowPage';
import { OnboardingOverlay } from '../pages/OnboardingOverlay';

function renderAtRoute(path: string, ui: React.ReactNode, routePattern: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePattern} element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('pages smoke tests', () => {
  it('HomePage loads nearby persons', async () => {
    renderAtRoute('/home', <HomePage />, '/home');
    await waitFor(() => expect(screen.getByText(/I nærheden/i)).toBeInTheDocument());
    expect(await screen.findByText('H.C. Andersen')).toBeInTheDocument();
    expect(screen.getByText('Temaruter')).toBeInTheDocument();
  });

  it('ScannerPage shows the scan hint and simulate button', () => {
    renderAtRoute('/scanner', <ScannerPage />, '/scanner');
    expect(screen.getByText(/Placer gravstenen/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simuler scanning/i })).toBeInTheDocument();
  });

  it('PersonPage renders the requested person', async () => {
    renderAtRoute('/person/1', <PersonPage />, '/person/:id');
    expect(await screen.findByText('H.C. Andersen')).toBeInTheDocument();
    expect(screen.getByText('Tidslinje')).toBeInTheDocument();
  });

  it('PersonPage shows not-found for unknown id', async () => {
    renderAtRoute('/person/9999', <PersonPage />, '/person/:id');
    expect(await screen.findByText(/ikke fundet/i)).toBeInTheDocument();
  });

  it('TimeWindowPage renders for a known person', async () => {
    renderAtRoute('/person/1/time-window', <TimeWindowPage />, '/person/:id/time-window');
    expect(await screen.findByText('København i Guldalderen')).toBeInTheDocument();
  });

  it('MapPage renders filters', async () => {
    renderAtRoute('/map', <MapPage />, '/map');
    expect(screen.getByRole('button', { name: /Alle/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'H.C. Andersen' }).length).toBeGreaterThan(0),
    );
  });

  it('ProfilePage renders user stats', () => {
    renderAtRoute('/profile', <ProfilePage />, '/profile');
    expect(screen.getByText('Historisk Nysgerrig')).toBeInTheDocument();
    expect(screen.getByText('Scannet')).toBeInTheDocument();
  });

  it('OnboardingOverlay renders first step', () => {
    render(<OnboardingOverlay onDone={() => {}} />);
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Næste/i })).toBeInTheDocument();
  });
});
