import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DeskIntro } from './components/DeskIntro';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabBar } from './components/TabBar';
import { Toaster } from './components/Toaster';
import { hasCompletedOnboarding, markOnboardingComplete } from './lib/onboarding';
import { AboutPage } from './pages/AboutPage';
import { AskPage } from './pages/AskPage';
import { CemeteryPage } from './pages/CemeteryPage';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { OnboardingOverlay } from './pages/OnboardingOverlay';
import { PersonPage } from './pages/PersonPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoutePage } from './pages/RoutePage';
import { ScannerPage } from './pages/ScannerPage';
import { SearchPage } from './pages/SearchPage';
import { SubmitPage } from './pages/SubmitPage';
import { TimeWindowPage } from './pages/TimeWindowPage';

export default function App() {
  const [onboarded, setOnboarded] = useState(() => hasCompletedOnboarding());
  const { pathname } = useLocation();
  const screenRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (screenRef.current) screenRef.current.scrollTop = 0;
  }, [pathname]);

  const handleOnboardingDone = () => {
    markOnboardingComplete();
    setOnboarded(true);
  };

  const immersive = pathname.startsWith('/scanner');
  // Chat screens use the full height for the message composer (like Messages).
  const hideTabBar = immersive || pathname.endsWith('/ask');

  return (
    <div className="app-shell">
      <DeskIntro />
      <div className="device">
        <div className={`device-screen ${immersive ? 'is-immersive' : ''}`}>
          <div className="device-island" aria-hidden="true" />
          <div className="status-spacer" />

          {!onboarded && <OnboardingOverlay onDone={handleOnboardingDone} />}

          <main className="screen" ref={screenRef}>
            <ErrorBoundary key={pathname}>
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
