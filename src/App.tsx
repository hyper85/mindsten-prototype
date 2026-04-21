import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabBar } from './components/TabBar';
import { hasCompletedOnboarding, markOnboardingComplete } from './lib/onboarding';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { OnboardingOverlay } from './pages/OnboardingOverlay';
import { PersonPage } from './pages/PersonPage';
import { ProfilePage } from './pages/ProfilePage';
import { ScannerPage } from './pages/ScannerPage';
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
      <div className="badge-row">
        <span className="badge-pill">Prototype</span>
        <span className="badge-pill">React · Interaktiv</span>
      </div>
      <div className="hero-title">
        Mind<span>STEN</span>
      </div>
      <div className="hero-sub">Bring fortiden til live, én sten ad gangen.</div>

      <div className="phone-frame">
        <div className="phone-notch" />

        {!onboarded && <OnboardingOverlay onDone={handleOnboardingDone} />}

        <div className="screen" ref={screenRef}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/person/:id" element={<PersonPage />} />
              <Route path="/person/:id/time-window" element={<TimeWindowPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>

        {onboarded && !hideTabBar && <TabBar />}
      </div>
    </div>
  );
}
