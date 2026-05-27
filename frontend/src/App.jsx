import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppShell from './components/AppShell.jsx';

const Login             = lazy(() => import('./pages/Login.jsx'));
const Dashboard         = lazy(() => import('./pages/Dashboard.jsx'));
const NewProject        = lazy(() => import('./pages/NewProject.jsx'));
const ProjectWorkspace  = lazy(() => import('./pages/ProjectWorkspace.jsx'));
const TaskManagement    = lazy(() => import('./pages/TaskManagement.jsx'));
const Settings          = lazy(() => import('./pages/Settings.jsx'));
const Admin             = lazy(() => import('./pages/Admin.jsx'));

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

export default function App() {
  const { loading } = useAuth();
  const [showWakeUp, setShowWakeUp] = useState(false);

  useEffect(() => {
    if (!loading) { setShowWakeUp(false); return; }
    const t = setTimeout(() => setShowWakeUp(true), 2500);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) return showWakeUp ? <WakeUpOverlay /> : <PageFallback />;

  return (
    <ErrorBoundary>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
