import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import {
  selectProjects, selectProjectsStatus, selectProjectsHasMore, selectProjectsTotal,
  selectProjectsSearch, selectProjectsSort, selectLoadingMore,
  fetchProjects, refreshProjects, loadMoreProjects, deleteProjectThunk, setSearch, setSort,
} from '../store/slices/projectsSlice.js';

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

  function handleClick() {
    if (project.status === 'onboarding') {
      navigate(`/new-project?resumeId=${project._id}`);
    } else {
      navigate(`/projects/${project._id}/workspace`);
    }
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`למחוק את "${project.title}"?\nכל הנתונים יימחקו לצמיתות.`)) return;
    dispatch(deleteProjectThunk(project._id))
      .unwrap()
      .then(() => toast.success('הפרויקט נמחק'))
      .catch((err) => toast.error(err || 'שגיאה במחיקה'));
  }

  return (
    <div className="project-card" onClick={handleClick} style={{ cursor: 'pointer' }}>
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
  const { t }        = useTranslation();
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const user         = useSelector(selectCurrentUser);
  const projects     = useSelector(selectProjects);
  const status       = useSelector(selectProjectsStatus);
  const hasMore      = useSelector(selectProjectsHasMore);
  const total        = useSelector(selectProjectsTotal);
  const storeSearch  = useSelector(selectProjectsSearch);
  const storeSort    = useSelector(selectProjectsSort);
  const loadingMore  = useSelector(selectLoadingMore);

  const [searchInput, setSearchInput] = useState(storeSearch);

  function handleSort(newSort) {
    dispatch(setSort(newSort));
    dispatch(fetchProjects({ page: 1, search: searchInput, sort: newSort }));
  }

  // Debounced search: fire fetchProjects 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setSearch(searchInput));
      dispatch(fetchProjects({ page: 1, search: searchInput, sort: storeSort }));
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Initial load (no search)
  useEffect(() => {
    if (status === 'idle') dispatch(fetchProjects({ page: 1, search: '' }));
  }, [dispatch, status]);

  // Auto-refresh every 30s while any project is actively running — paused during active search
  const hasActive = projects.some((p) => ACTIVE_STATUSES.has(p.status));
  useEffect(() => {
    if (!hasActive || searchInput) return;
    const timer = setInterval(() => dispatch(refreshProjects()), 30_000);
    return () => clearInterval(timer);
  }, [hasActive, dispatch, searchInput]);

  const handleLoadMore = useCallback(() => {
    const nextPage = Math.floor(projects.length / 12) + 1;
    dispatch(loadMoreProjects({ page: nextPage, search: storeSearch, sort: storeSort }));
  }, [dispatch, projects.length, storeSearch, storeSort]);

  return (
    <div className="dashboard-shell">
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

        {/* Search + sort bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0', flexWrap: 'wrap' }}>
          <input
            type="search"
            className="form-input"
            placeholder="חיפוש פרויקטים..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ maxWidth: 280, fontSize: 14, padding: '6px 12px' }}
            dir="rtl"
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'date',       label: '📅 תאריך' },
              { key: 'status',     label: '🔵 סטטוס' },
              { key: 'completion', label: '📊 התקדמות' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: storeSort === key ? 'var(--brand-primary)' : 'var(--surface-2)',
                  color: storeSort === key ? '#fff' : 'var(--text-muted)',
                  fontWeight: storeSort === key ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {status === 'succeeded' && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 'auto' }}>
              {total} פרויקטים
            </span>
          )}
        </div>

        {status === 'loading' ? (
          <div className="projects-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="project-card skeleton" style={{ height: 140 }} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-state__icon">
              {searchInput ? '🔍' : '🚀'}
            </div>
            <div className="empty-state__title">
              {searchInput ? `אין תוצאות עבור "${searchInput}"` : t('dashboard.empty')}
            </div>
            {!searchInput && (
              <>
                <div className="empty-state__sub">{t('dashboard.emptySub')}</div>
                <button className="btn btn--primary" style={{ marginTop: 20 }} onClick={() => navigate('/new-project')}>
                  + {t('dashboard.newProject')}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="projects-grid">
              {projects.map((p) => <ProjectCard key={p._id} project={p} dispatch={dispatch} />)}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button
                  className="btn btn--secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{ minWidth: 160 }}
                >
                  {loadingMore ? 'טוען...' : 'טען עוד פרויקטים'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
