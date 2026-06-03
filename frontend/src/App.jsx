import { Routes, Route } from 'react-router-dom';
import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppShell from './components/AppShell.jsx';
import BottomSheet from './components/ui/BottomSheet.jsx';
import OfflineBanner from './components/ui/OfflineBanner.jsx';
import CookieConsent from './components/ui/CookieConsent.jsx'; // Sprint 144
import {
  InstallSheetContent, UpdateSheetContent, VersionSheetContent,
  isStandalone, isIOS, INSTALL_DISMISSED_KEY,
} from './components/ui/PWASheets.jsx';

const Home             = lazy(() => import('./pages/Home.jsx'));
const Login            = lazy(() => import('./pages/Login.jsx'));
const Dashboard        = lazy(() => import('./pages/Dashboard.jsx'));
const NewProject       = lazy(() => import('./pages/NewProject.jsx'));
const ProjectWorkspace = lazy(() => import('./pages/ProjectWorkspace.jsx'));
const TaskManagement   = lazy(() => import('./pages/TaskManagement.jsx'));
const Settings         = lazy(() => import('./pages/Settings.jsx'));
const Admin            = lazy(() => import('./pages/Admin.jsx'));
const Profile          = lazy(() => import('./pages/Profile.jsx'));
const Status           = lazy(() => import('./pages/Status.jsx'));
const NotFound         = lazy(() => import('./pages/NotFound.jsx'));
const SharedProject    = lazy(() => import('./pages/SharedProject.jsx')); // Sprint 123

const VERSION_KEY = 'pwa-version';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      const isPage = this.props.page;
      return (
        <div style={{ padding: 32, color: '#fff', background: isPage ? '#0a0a0f' : 'transparent', minHeight: isPage ? '60vh' : 'auto', direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: isPage ? 'center' : 'flex-start', justifyContent: 'center' }}>
          <h2 style={{ marginBottom: 8 }}>{isPage ? 'שגיאה בדף' : 'שגיאה בלתי צפויה'}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.6, maxWidth: 600 }}>{String(this.state.error)}</pre>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {isPage && (
              <button onClick={() => this.setState({ hasError: false, error: null })} style={{ background: '#1e1e2e', color: '#e2e8f0', border: '1px solid #2d2d44', padding: '10px 20px', borderRadius: 8 }}>
                נסה שוב
              </button>
            )}
            <button onClick={() => window.location.reload()} style={{ background: '#7c3aed', color: '#fff', border: 0, padding: '10px 20px', borderRadius: 8 }}>
              טען מחדש
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageBoundary({ children }) { return <ErrorBoundary page>{children}</ErrorBoundary>; }

function PageFallback() {
  return <div className="page-fallback"><div className="pwa-spinner" /></div>;
}

function WakeUpOverlay() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="wakeup-overlay">
      <div className="wakeup-overlay__inner">
        <div className="wakeup-overlay__icon">⚡</div>
        <div className="pwa-spinner" />
        <div className="wakeup-overlay__title">Power Plan מתחיל{dots}</div>
        <div className="wakeup-overlay__sub">מתחבר לשרת...</div>
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();
  const [showWakeUp,     setShowWakeUp]     = useState(false);
  const [sheet,          setSheet]          = useState(null);
  const [deferredPrompt, setDeferred]       = useState(null);
  const [prevVersion,    setPrevVersion]    = useState(null);

  const closeSheet = useCallback(() => {
    if (sheet === 'install') localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setSheet(null);
  }, [sheet]);

  useEffect(() => {
    const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
    if (isStandalone() && current) {
      const stored = localStorage.getItem(VERSION_KEY);
      if (stored && stored !== current) { setPrevVersion(stored); setSheet('version'); }
      localStorage.setItem(VERSION_KEY, current);
    }

    const onSwUpdated = () => {
      if (isStandalone()) setSheet((s) => s === 'version' ? s : 'update');
      else window.location.reload();
    };
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (!localStorage.getItem(INSTALL_DISMISSED_KEY) && !isStandalone()) {
        setSheet((s) => s || 'install');
      }
    };

    window.addEventListener('sw-updated', onSwUpdated);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    if (isIOS() && !isStandalone() && !localStorage.getItem(INSTALL_DISMISSED_KEY)) {
      setSheet((s) => s || 'install');
    }
    return () => {
      window.removeEventListener('sw-updated', onSwUpdated);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (!loading) { setShowWakeUp(false); return; }
    const timer = setTimeout(() => setShowWakeUp(true), 2500);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) return showWakeUp ? <WakeUpOverlay /> : <PageFallback />;

  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <CookieConsent />
      {sheet && (
        <BottomSheet onClose={closeSheet}>
          {sheet === 'install' && <InstallSheetContent deferredPrompt={deferredPrompt} onClose={closeSheet} />}
          {sheet === 'update'  && <UpdateSheetContent onClose={closeSheet} />}
          {sheet === 'version' && <VersionSheetContent prevVersion={prevVersion} currentVersion={currentVersion} onClose={closeSheet} />}
        </BottomSheet>
      )}
      {/* Screen-reader live region — mirrors toast messages for assistive technology */}
      <div id="toast-announcer" aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }} />
      <Toaster
        position="bottom-left"
        containerAriaLabel="הודעות מערכת"
        toastOptions={{
          style: { background: '#1e1e2e', color: '#e2e8f0', border: '1px solid #2d2d44', direction: 'rtl' },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1e1e2e' } },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1e1e2e' } },
        }}
      />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login"   element={<Login />} />
          <Route path="/status"  element={<Status />} />
          <Route path="/"        element={<PageBoundary><Home /></PageBoundary>} />
          <Route path="/dashboard"              element={<ProtectedRoute><AppShell><PageBoundary><Dashboard /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/new-project"            element={<ProtectedRoute><AppShell><PageBoundary><NewProject /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/projects/:id/workspace" element={<ProtectedRoute><AppShell><PageBoundary><ProjectWorkspace /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/projects/:id/tasks"     element={<ProtectedRoute><AppShell><PageBoundary><TaskManagement /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/settings"               element={<ProtectedRoute><AppShell><PageBoundary><Settings /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/profile"                element={<ProtectedRoute><AppShell><PageBoundary><Profile /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/admin"                  element={<ProtectedRoute roles={['admin']}><AppShell><PageBoundary><Admin /></PageBoundary></AppShell></ProtectedRoute>} />
          {/* Sprint 123: public share viewer */}
          <Route path="/share/:shareToken" element={<PageBoundary><SharedProject /></PageBoundary>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
