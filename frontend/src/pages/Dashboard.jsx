import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Skeleton from '@mui/material/Skeleton';
import toast from 'react-hot-toast';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { friendlyError } from '../utils/errorMessages.js';
import {
  selectProjects, selectProjectsStatus, selectProjectsHasMore, selectProjectsTotal,
  selectProjectsSearch, selectProjectsSort, selectLoadingMore,
  fetchProjects, refreshProjects, loadMoreProjects, deleteProjectThunk, setSort,
} from '../store/slices/projectsSlice.js';
import { restoreProject } from '../api/projects.api.js';

const ACTIVE_STATUSES = new Set(['planning', 'coding', 'deploying']);

function ProjectCard({ project, dispatch }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
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
    const projectId = project._id;
    const projectTitle = project.title;
    dispatch(deleteProjectThunk(projectId))
      .unwrap()
      .then(() => {
        toast((toastInstance) => (
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {`"${projectTitle}" נמחק`}
            <button
              style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              onClick={() => {
                restoreProject(projectId)
                  .then(() => { dispatch(fetchProjects({ page: 1 })); toast.dismiss(toastInstance.id); })
                  .catch(() => toast.error('לא ניתן לשחזר'));
              }}
            >
              ביטול
            </button>
          </span>
        ), { duration: 5000 });
      })
      .catch((err) => toast.error(friendlyError(err)));
  }

  return (
    <div className="project-card" onClick={handleClick}>
      <div className="project-card__header">
        <span className="project-card__title">{project.title}</span>
        <span className={`project-status project-status--${project.status}`}>
          {isActive && <span className="project-status__dot" />}
          {t(`dashboard.status.${project.status}`, project.status)}
        </span>
      </div>
      <p className="project-card__idea">{project.idea}</p>
      <div className="project-card__footer">
        <div className="project-card__progress">
          <div className="project-card__progress-bar" style={{ width: `${project.completionPercent || 0}%` }} />
        </div>
        <span className="project-card__percent">{project.completionPercent || 0}%</span>
        <button className="project-card__delete" onClick={handleDelete} title="מחק פרויקט">
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

  function handleSort(newSort) {
    dispatch(setSort(newSort));
  }

  // Fetch projects when search or sort changes (covers initial load too)
  useEffect(() => {
    const ctrl = new AbortController();
    dispatch(fetchProjects({ page: 1, search: storeSearch, sort: storeSort, signal: ctrl.signal }));
    return () => ctrl.abort();
  }, [storeSearch, storeSort, dispatch]);

  // Auto-refresh every 30s while any project is actively running — paused during active search
  const hasActive = projects.some((p) => ACTIVE_STATUSES.has(p.status));
  useEffect(() => {
    if (!hasActive || storeSearch) return;
    const timer = setInterval(() => dispatch(refreshProjects()), 30_000);
    return () => clearInterval(timer);
  }, [hasActive, dispatch, storeSearch]);

  const handleLoadMore = useCallback(() => {
    const nextPage = Math.floor(projects.length / 12) + 1;
    dispatch(loadMoreProjects({ page: nextPage, search: storeSearch, sort: storeSort }));
  }, [dispatch, projects.length, storeSearch, storeSort]);

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">{t('dashboard.title')}</h1>
            <p className="dashboard-subtitle">שלום, {user?.name} 👋</p>
          </div>
          <button className="btn-new-project" onClick={() => navigate('/new-project')}>
            + {t('dashboard.newProject')}
          </button>
        </div>

        {/* Sort bar */}
        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__sort">
            {[
              { key: 'date',       label: '📅 תאריך' },
              { key: 'status',     label: '🔵 סטטוס' },
              { key: 'completion', label: '📊 התקדמות' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`sort-btn${storeSort === key ? ' sort-btn--active' : ''}`}
                onClick={() => handleSort(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {status === 'succeeded' && (
            <span className="dashboard-toolbar__count">{total} פרויקטים</span>
          )}
        </div>

        {status === 'loading' ? (
          <div className="projects-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="project-card" style={{ padding: 18 }}>
                <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="90%" height={14} />
                <Skeleton variant="text" width="80%" height={14} />
                <Skeleton variant="rectangular" height={24} width="40%" sx={{ mt: 2, borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state dashboard-empty-state">
            {searchInput ? (
              <>
                <div className="empty-state__icon">🔍</div>
                <div className="empty-state__title">{`אין תוצאות עבור "${searchInput}"`}</div>
              </>
            ) : (
              <>
                <div className="empty-state__icon">⚡</div>
                <div className="empty-state__title">{t('onboarding.welcome')}</div>
                <div className="empty-state__sub">{t('onboarding.tagline')}</div>
                <div className="dashboard-empty__steps">
                  <div className="dashboard-empty__step">
                    <span className="dashboard-empty__step-num">1</span>
                    {t('onboarding.step1')}
                  </div>
                  <div className="dashboard-empty__step">
                    <span className="dashboard-empty__step-num">2</span>
                    {t('onboarding.step2')}
                  </div>
                  <div className="dashboard-empty__step">
                    <span className="dashboard-empty__step-num">3</span>
                    {t('onboarding.step3')}
                  </div>
                </div>
                <button className="btn btn--primary dashboard-empty__cta" onClick={() => navigate('/new-project')}>
                  {t('onboarding.cta')}
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
              <div className="dashboard-load-more">
                <button
                  className="btn btn--secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
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
