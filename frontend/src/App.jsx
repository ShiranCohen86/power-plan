import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

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
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 32, color: '#fff', background: '#0a0a0f', minHeight: '100vh', direction: 'rtl' }}>
        <h2>שגיאה בלתי צפויה</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, opacity: 0.6 }}>{String(this.state.error)}</pre>
        <button onClick={() => window.location.reload()} style={{ background: '#7c3aed', color: '#fff', border: 0, padding: '10px 20px', borderRadius: 8, marginTop: 16 }}>
          טען מחדש
        </button>
      </div>
    );
    return this.props.children;
  }
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
          <Route path="/projects/:id/workspace" element={<ProtectedRoute><ProjectWorkspace /></ProtectedRoute>} />
          <Route path="/projects/:id/tasks"     element={<ProtectedRoute><TaskManagement /></ProtectedRoute>} />
          <Route path="/settings"              element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin"               element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
