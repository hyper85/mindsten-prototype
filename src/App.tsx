import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineNotice } from './components/OfflineNotice';
import { LoadingState } from './components/StatePanel';
import { TabBar } from './components/TabBar';
import { Toaster } from './components/Toaster';
import { hasCompletedOnboarding, markOnboardingComplete } from './lib/onboarding';
import { useMediaQuery } from './lib/media';
import { applyPendingUpdate } from './lib/pwa';
import { useScrollRestoration } from './lib/scroll';
import { HomePage } from './pages/HomePage';
import { OnboardingOverlay } from './pages/OnboardingOverlay';
import { PersonPage } from './pages/PersonPage';
import { SearchPage } from './pages/SearchPage';

// Home, person and search are the common entry points; everything else loads on demand.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const AboutPage = page(() => import('./pages/AboutPage'), 'AboutPage');
const AskPage = page(() => import('./pages/AskPage'), 'AskPage');
const CemeteryPage = page(() => import('./pages/CemeteryPage'), 'CemeteryPage');
const MapPage = page(() => import('./pages/MapPage'), 'MapPage');
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage');
const RoutePage = page(() => import('./pages/RoutePage'), 'RoutePage');
const ScannerPage = page(() => import('./pages/ScannerPage'), 'ScannerPage');
const SubmitPage = page(() => import('./pages/SubmitPage'), 'SubmitPage');
const TimeWindowPage = page(() => import('./pages/TimeWindowPage'), 'TimeWindowPage');
const DeskIntro = lazy(() =>
  import('./components/DeskIntro').then((m) => ({ default: m.DeskIntro })),
);

export default function App() {
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding());
  const { pathname } = useLocation();
  const screenRef = useRef<HTMLElement | null>(null);
  // Matches the CSS that shows the desktop intro next to the phone frame.
  const desk = useMediaQuery('(min-width: 1081px) and (pointer: fine)');

  useScrollRestoration(screenRef);
  useEffect(() => applyPendingUpdate(), [pathname]);

  const handleOnboardingDone = () => {
    markOnboardingComplete();
    setOnboarded(true);
  };

  const immersive = pathname.startsWith('/scanner');
  // Chat screens use the full height for the message composer (like Messages).
  const hideTabBar = immersive || pathname.endsWith('/ask');

  return (
    <div className="app-shell">
      {desk && (
        <Suspense fallback={null}>
          <DeskIntro />
        </Suspense>
      )}
      <div className="device">
        <div className={`device-screen ${immersive ? 'is-immersive' : ''}`}>
          <div className="device-island" aria-hidden="true" />
          <div className="status-spacer" />

          {!onboarded && <OnboardingOverlay onDone={handleOnboardingDone} />}
          <OfflineNotice />

          {/* While the welcome dialog is open, the app behind it is inert. */}
          <main className="screen" ref={screenRef} {...(onboarded ? {} : { inert: '' })}>
            <ErrorBoundary key={pathname}>
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/scanner" element={<ScannerPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/person/:id" element={<PersonPage />} />
                  <Route path="/person/:id/time-window" element={<TimeWindowPage />} />
                  <Route path="/person/:id/ask" element={<AskPage />} />
                  <Route path="/cemetery/:id" element={<CemeteryPage />} />
                  <Route path="/route/:id" element={<RoutePage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/submit" element={<SubmitPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>

          {onboarded && !hideTabBar && <TabBar />}
          <Toaster />
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
