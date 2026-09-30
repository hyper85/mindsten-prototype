import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabBar } from './components/TabBar';
import { hasCompletedOnboarding, markOnboardingComplete } from './lib/onboarding';
import { AboutPage } from './pages/AboutPage';
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
  const screenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (screenRef.current) screenRef.current.scrollTop = 0;
  }, [pathname]);

  const handleOnboardingDone = () => {
    markOnboardingComplete();
    setOnboarded(true);
  };

  const hideTabBar = pathname.startsWith('/scanner');

  return (
    <div className="mindsten-root">
      <div className="desktop-intro" aria-hidden="true">
        <div className="hero-title">
          Mind<span>STEN</span>
        </div>
        <div className="hero-sub">Bring fortiden til live, én sten ad gangen.</div>
        <div className="hero-hint">Åbn siden på din telefon, når du står på kirkegården.</div>
      </div>

      <div className="phone-frame">
        <div className="phone-notch" />

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
      </div>
    </div>
  );
}
