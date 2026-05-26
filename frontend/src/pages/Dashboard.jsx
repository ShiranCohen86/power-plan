import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { selectProjects, selectProjectsStatus, fetchProjects } from '../store/slices/projectsSlice.js';
import { getSettings } from '../api/settings.api.js';

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
  const [hasApiKey, setHasApiKey] = useState(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchProjects());
  }, [dispatch, status]);

  useEffect(() => {
    getSettings()
      .then((s) => setHasApiKey(s.hasApiKey))
      .catch(() => setHasApiKey(true));
  }, []);

  return (
    <div className="dashboard-shell">
      {/* Setup banner — shown until Anthropic key is configured */}
      {hasApiKey === false && (
        <div className="dashboard-setup-banner">
          <div className="dashboard-setup-banner__inner">
            <span className="dashboard-setup-banner__icon">🔑</span>
            <div className="dashboard-setup-banner__text">
              <strong>צעד ראשון: הגדר את מפתח ה-AI שלך</strong>
              <span>כדי להתחיל לבנות אפליקציות, Power Plan צריכה גישה ל-Claude. זה לוקח פחות מדקה.</span>
            </div>
            <button className="btn btn--primary" onClick={() => navigate('/settings')}>
              ⚙️ הגדר עכשיו →
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{t('dashboard.title')}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
              שלום, {user?.name} 👋
            </p>
          </div>
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
