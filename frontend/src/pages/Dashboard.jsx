import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { selectProjects, selectProjectsStatus, fetchProjects, refreshProjects, deleteProjectThunk } from '../store/slices/projectsSlice.js';

const STATUS_COLORS = {
  onboarding: '#7c3aed',
  planning:   '#2563eb',
  coding:     '#059669',
  deploying:  '#d97706',
  live:       '#16a34a',
  failed:     '#dc2626',
  paused:     '#6b7280',
};

const ACTIVE_STATUSES = new Set(['planning', 'coding', 'deploying']);

function ProjectCard({ project, dispatch }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const color    = STATUS_COLORS[project.status] || '#6b7280';
  const isActive = ACTIVE_STATUSES.has(project.status);

  function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`למחוק את "${project.title}"?\nכל הנתונים יימחקו לצמיתות.`)) return;
    dispatch(deleteProjectThunk(project._id))
      .unwrap()
      .then(() => toast.success('הפרויקט נמחק'))
      .catch((err) => toast.error(err || 'שגיאה במחיקה'));
  }

  return (
    <div className="project-card" onClick={() => navigate(`/projects/${project._id}/workspace`)} style={{ cursor: 'pointer' }}>
      <div className="project-card__header">
        <span className="project-card__title">{project.title}</span>
        <span className="badge" style={{ background: `${color}22`, color, borderColor: `${color}44`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {isActive && (
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: color, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          )}
          {t(`dashboard.status.${project.status}`, project.status)}
        </span>
      </div>
      <p className="project-card__idea">{project.idea}</p>
      <div className="project-card__footer">
        <div className="project-card__progress">
          <div className="project-card__progress-bar" style={{ width: `${project.completionPercent || 0}%` }} />
        </div>
        <span className="project-card__percent">{project.completionPercent || 0}%</span>
        <button
          onClick={handleDelete}
          title="מחק פרויקט"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                   fontSize: 14, padding: '0 4px', opacity: 0.5, lineHeight: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          🗑️
        </button>
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
  useEffect(() => {
    if (status === 'idle') dispatch(fetchProjects());
  }, [dispatch, status]);

  // Auto-refresh every 30s while any project is actively running
  const hasActive = projects.some((p) => ACTIVE_STATUSES.has(p.status));
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => dispatch(refreshProjects()), 30_000);
    return () => clearInterval(t);
  }, [hasActive, dispatch]);

  return (
    <div className="dashboard-shell">
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
            {projects.map((p) => <ProjectCard key={p._id} project={p} dispatch={dispatch} />)}
          </div>
        )}
      </main>
    </div>
  );
}
