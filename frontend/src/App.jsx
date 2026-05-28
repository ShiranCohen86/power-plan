import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import DOMPurify from 'dompurify';
import { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppShell from './components/AppShell.jsx';
import BottomSheet from './components/ui/BottomSheet.jsx';

const Login             = lazy(() => import('./pages/Login.jsx'));
const Dashboard         = lazy(() => import('./pages/Dashboard.jsx'));
const NewProject        = lazy(() => import('./pages/NewProject.jsx'));
const ProjectWorkspace  = lazy(() => import('./pages/ProjectWorkspace.jsx'));
const TaskManagement    = lazy(() => import('./pages/TaskManagement.jsx'));
const Settings          = lazy(() => import('./pages/Settings.jsx'));
const Admin             = lazy(() => import('./pages/Admin.jsx'));
const Status            = lazy(() => import('./pages/Status.jsx'));

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    // Log component stack to help diagnose production issues
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

function PageBoundary({ children }) {
  return <ErrorBoundary page>{children}</ErrorBoundary>;
}

function PageFallback() {
  return (
    <div className="page-fallback">
      <div className="pwa-spinner" />
    </div>
  );
}

// Cold-start overlay — shown if auth bootstrap takes more than 2.5s
function WakeUpOverlay() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500);
    return () => clearInterval(t);
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

// ── Bottom sheet types ───────────────────────────────────────────────────────
// 'install'  — show PWA install instructions (mobile browser, not installed)
// 'update'   — new service worker took control mid-session
// 'version'  — opened installed PWA after a version bump

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
const VERSION_KEY            = 'pwa-version';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isMobileUA() {
  return /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
}

// ── Install sheet content ────────────────────────────────────────────────────
function InstallSheetContent({ deferredPrompt, onClose }) {
  const { t } = useTranslation();

  async function handleNativeInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    onClose();
  }

  if (deferredPrompt) {
    return (
      <>
        <div className="bsheet__title">{t('pwa.installTitle')}</div>
        <div className="bsheet__body">{t('pwa.installBody')}</div>
        <div className="bsheet__actions">
          <button className="btn btn--primary" onClick={handleNativeInstall}>{t('pwa.installNow')}</button>
          <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.notNow')}</button>
        </div>
      </>
    );
  }

  if (isIOS()) {
    return (
      <>
        <div className="bsheet__title">{t('pwa.iosTitle')}</div>
        <div className="bsheet__body">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwa.iosStep1')) }} />
          <p style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwa.iosStep2')) }} />
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' }}>{t('pwa.iosHint')}</p>
        </div>
        <div className="bsheet__actions">
          <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.iosGot')}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bsheet__title">{t('pwa.genericTitle')}</div>
      <div className="bsheet__body">
        <p>{t('pwa.genericBody')}</p>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' }}>{t('pwa.genericHint')}</p>
      </div>
      <div className="bsheet__actions">
        <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.genericGot')}</button>
      </div>
    </>
  );
}

// ── SW update sheet content ──────────────────────────────────────────────────
function UpdateSheetContent({ onClose }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="bsheet__title">{t('pwa.updateTitle')}</div>
      <div className="bsheet__body">{t('pwa.updateBody')}</div>
      <div className="bsheet__actions">
        <button className="btn btn--primary" onClick={() => window.location.reload()}>{t('pwa.reload')}</button>
        <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.later')}</button>
      </div>
    </>
  );
}

// ── Version changelog sheet content ─────────────────────────────────────────
function VersionSheetContent({ prevVersion, currentVersion, onClose }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="bsheet__title">{t('pwa.versionTitle')}</div>
      <div className="bsheet__body">
        {prevVersion
          ? <span>{t('pwa.versionBody', { prev: prevVersion, next: currentVersion })}</span>
          : <span>{t('pwa.versionBodyNew', { next: currentVersion })}</span>}
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-subtle)' }}>
          {t('pwa.versionNote')}
        </p>
      </div>
      <div className="bsheet__actions">
        <button className="btn btn--primary" onClick={onClose}>{t('pwa.great')}</button>
      </div>
    </>
  );
}

export default function App() {
  const { loading } = useAuth();
  const [showWakeUp, setShowWakeUp]     = useState(false);
  const [sheet, setSheet]               = useState(null); // null | 'install' | 'update' | 'version'
  const [deferredPrompt, setDeferred]   = useState(null);
  const [prevVersion, setPrevVersion]   = useState(null);

  const closeSheet = useCallback(() => {
    if (sheet === 'install') localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    setSheet(null);
  }, [sheet]);

  useEffect(() => {
    // ── Version check (only when running as installed PWA) ───────────────
    const current = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
    if (isStandalone() && current) {
      const stored = localStorage.getItem(VERSION_KEY);
      if (stored && stored !== current) {
        setPrevVersion(stored);
        setSheet('version');
      }
      localStorage.setItem(VERSION_KEY, current);
    }

    // ── SW update notification ───────────────────────────────────────────
    // In a regular browser: reload silently. In installed PWA: show sheet.
    const onSwUpdated = () => {
      if (isStandalone()) {
        setSheet((s) => s === 'version' ? s : 'update');
      } else {
        window.location.reload();
      }
    };
    window.addEventListener('sw-updated', onSwUpdated);

    // ── PWA install prompt ───────────────────────────────────────────────
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (!localStorage.getItem(INSTALL_DISMISSED_KEY) && !isStandalone()) {
        setSheet((s) => s || 'install');
      }
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS Safari cannot trigger beforeinstallprompt — show manual instructions after 4 s.
    // Chrome/Edge/Android are handled by the beforeinstallprompt event above.
    let installTimer;
    if (isIOS() && !isStandalone() && !localStorage.getItem(INSTALL_DISMISSED_KEY)) {
      installTimer = setTimeout(() => setSheet((s) => s || 'install'), 4000);
    }

    return () => {
      window.removeEventListener('sw-updated', onSwUpdated);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      clearTimeout(installTimer);
    };
  }, []);

  useEffect(() => {
    if (!loading) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2500);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) return showWakeUp ? <WakeUpOverlay /> : <PageFallback />;

  return (
    <ErrorBoundary>
      {sheet && (
        <BottomSheet onClose={closeSheet}>
          {sheet === 'install' && <InstallSheetContent deferredPrompt={deferredPrompt} onClose={closeSheet} />}
          {sheet === 'update'  && <UpdateSheetContent onClose={closeSheet} />}
          {sheet === 'version' && <VersionSheetContent prevVersion={prevVersion} currentVersion={typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''} onClose={closeSheet} />}
        </BottomSheet>
      )}
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: { background: '#1e1e2e', color: '#e2e8f0', border: '1px solid #2d2d44', direction: 'rtl' },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1e1e2e' } },
          success: { iconTheme: { primary: '#22c55e', secondary: '#1e1e2e' } },
        }}
      />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard"             element={<ProtectedRoute><AppShell><PageBoundary><Dashboard /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/new-project"           element={<ProtectedRoute><AppShell><PageBoundary><NewProject /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/projects/:id/workspace" element={<ProtectedRoute><AppShell><PageBoundary><ProjectWorkspace /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/projects/:id/tasks"    element={<ProtectedRoute><AppShell><PageBoundary><TaskManagement /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/settings"              element={<ProtectedRoute><AppShell><PageBoundary><Settings /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/admin"                 element={<ProtectedRoute roles={['admin']}><AppShell><PageBoundary><Admin /></PageBoundary></AppShell></ProtectedRoute>} />
          <Route path="/status" element={<Status />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
