import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice.js';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice.js';
import { selectProjects, selectProjectsStatus, fetchProjects } from '../store/slices/projectsSlice.js';
import NotificationBell from '../components/ui/NotificationBell.jsx';

const STATUS_COLORS = {
  onboarding: '#7c3aed',
  planning:   '#2563eb',
  coding:     '#059669',
  deploying:  '#d97706',
  live:       '#16a34a',
  failed:     '#dc2626',
  paused:     '#6b7280',
};

function ProjectCard({ project }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const color    = STATUS_COLORS[project.status] || '#6b7280';

  return (
    <div className="project-card" onClick={() => navigate(`/projects/${project._id}/workspace`)} style={{ cursor: 'pointer' }}>
      <div className="project-card__header">
        <span className="project-card__title">{project.title}</span>
        <span className="badge" style={{ background: `${color}22`, color, borderColor: `${color}44` }}>
          {t(`dashboard.status.${project.status}`, project.status)}
        </span>
      </div>
      <p className="project-card__idea">{project.idea}</p>
      <div className="project-card__footer">
        <div className="project-card__progress">
          <div className="project-card__progress-bar" style={{ width: `${project.completionPercent || 0}%` }} />
        </div>
        <span className="project-card__percent">{project.completionPercent || 0}%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t }       = useTranslation();
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const user        = useSelector(selectCurrentUser);
  const projects    = useSelector(selectProjects);
  const status      = useSelector(selectProjectsStatus);
  const lang        = useSelector(selectLanguage);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchProjects());
  }, [dispatch, status]);

  return (
    <div className="dashboard-shell">
      {/* Top bar */}
      <header className="dashboard-topbar">
        <div className="dashboard-topbar__brand">
          <span className="dashboard-topbar__logo">⚡</span>
          <span>Power Plan</span>
        </div>
        <div className="dashboard-topbar__actions">
          <button type="button" className="btn-ghost" onClick={() => dispatch(toggleLanguage())} style={{ fontSize: 13 }}>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <NotificationBell />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.name}</span>
          <button type="button" className="btn-secondary" onClick={() => dispatch(logoutUser())} style={{ fontSize: 12, padding: '6px 12px', minHeight: 'auto' }}>
            {t('auth.logout')}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{t('dashboard.title')}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
              שלום, {user?.name} 👋
            </p>
          </div>
          {user?.role === 'admin' && (
            <button className="btn-ghost" onClick={() => navigate('/admin')} style={{ minHeight: 36, padding: '4px 14px', marginInlineEnd: 4 }}>🔧 Admin</button>
          )}
          <button className="btn-ghost" onClick={() => navigate('/settings')} style={{ minHeight: 36, padding: '4px 14px', marginInlineEnd: 8 }}>⚙ הגדרות</button>
          <button className="btn-new-project" onClick={() => navigate('/new-project')}>
            + {t('dashboard.newProject')}
          </button>
        </div>

        {status === 'loading' ? (
          <div className="projects-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="project-card skeleton" style={{ height: 140 }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state__icon">🚀</div>
            <div className="empty-state__title">{t('dashboard.empty')}</div>
            <div className="empty-state__sub">{t('dashboard.emptySub')}</div>
            <button className="btn btn--primary" style={{ marginTop: 20 }} onClick={() => navigate('/new-project')}>
              + {t('dashboard.newProject')}
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}
