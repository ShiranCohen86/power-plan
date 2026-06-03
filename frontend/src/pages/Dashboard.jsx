import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Skeleton from '@mui/material/Skeleton';
import toast from 'react-hot-toast';
import { toastError } from '../utils/announce.js';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { friendlyError } from '../utils/errorMessages.js';
import { DASHBOARD_AUTO_REFRESH_MS, DASHBOARD_PAGE_SIZE } from '../config/constants.js';
import {
  selectProjects, selectProjectsStatus, selectProjectsHasMore, selectProjectsTotal,
  selectProjectsSearch, selectProjectsSort, selectProjectsStatusFilter, selectLoadingMore,
  selectSelectedIds, selectAllTags, selectTagFilter,
  fetchProjects, refreshProjects, loadMoreProjects, deleteProjectThunk, togglePinThunk,
  setSort, setStatusFilter, setTagFilter, updateProject, addProject,
  toggleSelectProject, selectAllProjects, clearSelection,
} from '../store/slices/projectsSlice.js';
import { restoreProject, cloneProject, archiveProject } from '../api/projects.api.js';
import DashboardStats from '../components/dashboard/DashboardStats.jsx';
import BulkActionsBar from '../components/dashboard/BulkActionsBar.jsx';

const ACTIVE_STATUSES = new Set(['planning', 'coding', 'deploying']);
const UNDO_TOAST_DURATION_MS = 5000;

function ProjectCard({ project, dispatch, isSelected, onToggleSelect }) {
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

  async function handleDelete(e) {
    e.stopPropagation();
    const projectId    = project._id;
    const projectTitle = project.title;
    try {
      await dispatch(deleteProjectThunk(projectId)).unwrap();
      const announcer = document.getElementById('toast-announcer');
      if (announcer) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = `"${projectTitle}" נמחק`; }); }
      toast((toastInstance) => (
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {`"${projectTitle}" נמחק`}
          <button
            style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            onClick={async () => {
              try {
                await restoreProject(projectId);
                dispatch(fetchProjects({ page: 1 }));
                toast.dismiss(toastInstance.id);
              } catch {
                toastError('לא ניתן לשחזר');
              }
            }}
          >
            ביטול
          </button>
        </span>
      ), { duration: UNDO_TOAST_DURATION_MS });
    } catch (err) {
      toastError(friendlyError(err));
    }
  }

  return (
    <div
      className={`project-card${isSelected ? ' project-card--selected' : ''}${project.isPinned ? ' project-card--pinned' : ''}`}
      onClick={handleClick}
    >
      {/* Sprint 94: bulk select checkbox */}
      <input
        type="checkbox"
        className="project-card__checkbox"
        checked={isSelected}
        onChange={(e) => { e.stopPropagation(); onToggleSelect(project._id); }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${project.title}`}
      />
      {/* Sprint 93: pin indicator */}
      {project.isPinned && <span className="project-card__pin" title="Pinned">📌</span>}
      <div className="project-card__header">
        <span className="project-card__title">{project.title}</span>
        <span className={`project-status project-status--${project.status}`}>
          {isActive && <span className="project-status__dot" />}
          {t(`dashboard.status.${project.status}`, project.status)}
        </span>
      </div>
      <p className="project-card__idea">{project.idea}</p>
      {/* Sprint 92: tag chips */}
      {project.tags?.length > 0 && (
        <div className="project-card__tags">
          {project.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="project-tag">{tag}</span>
          ))}
        </div>
      )}
      {project.status === 'live' && project.deployedUrl && (
        <a href={project.deployedUrl} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 11, color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          🌐 {project.deployedUrl.replace(/^https?:\/\//, '').slice(0, 40)}
        </a>
      )}
      <div className="project-card__footer">
        <div className="project-card__progress">
          <div className="project-card__progress-bar" style={{ width: `${project.completionPercent || 0}%` }} />
        </div>
        <span className="project-card__percent">{project.completionPercent || 0}%</span>
        <button
          className="project-card__delete"
          onClick={handleDelete}
          aria-label={`מחק פרויקט: ${project.title}`}
        >
          🗑️
        </button>
        {/* Sprint 93: pin toggle */}
        <button
          className="project-card__pin-btn"
          title={project.isPinned ? 'Unpin' : 'Pin to top'}
          onClick={async (e) => {
            e.stopPropagation();
            try { await dispatch(togglePinThunk(project._id)).unwrap(); } catch { /* non-critical */ }
          }}
        >
          {project.isPinned ? '📌' : '📍'}
        </button>
        <button
          className="project-card__clone"
          title={t('dashboard.clone')}
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const clone = await cloneProject(project._id);
              dispatch(addProject(clone));
            } catch { /* non-critical */ }
          }}
        >
          🔁
        </button>
        {project.status !== 'archived' && !ACTIVE_STATUSES.has(project.status) && (
          <button
            className="project-card__archive"
            title={t('dashboard.archive')}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await archiveProject(project._id);
                dispatch(updateProject({ ...project, status: 'archived' }));
              } catch { /* non-critical */ }
            }}
          >
            📦
          </button>
        )}
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
  const storeSearch       = useSelector(selectProjectsSearch);
  const storeSort         = useSelector(selectProjectsSort);
  const storeStatusFilter = useSelector(selectProjectsStatusFilter);
  const storeTagFilter    = useSelector(selectTagFilter);
  const loadingMore       = useSelector(selectLoadingMore);
  const selectedIds       = useSelector(selectSelectedIds);
  const allTags           = useSelector(selectAllTags);

  function handleSort(newSort) { dispatch(setSort(newSort)); }
  function handleStatusFilter(s) { dispatch(setStatusFilter(s)); }
  function handleTagFilter(tag) { dispatch(setTagFilter(storeTagFilter === tag ? '' : tag)); }
  function handleToggleSelect(id) { dispatch(toggleSelectProject(id)); }

  // Fetch projects when search, sort, statusFilter, or tagFilter changes
  useEffect(() => {
    const ctrl = new AbortController();
    dispatch(fetchProjects({ page: 1, search: storeSearch, sort: storeSort, statusFilter: storeStatusFilter, signal: ctrl.signal }));
    return () => ctrl.abort();
  }, [storeSearch, storeSort, storeStatusFilter, dispatch]);

  // Auto-refresh every 30s while any project is actively running — paused during active search
  const hasActive = projects.some((p) => ACTIVE_STATUSES.has(p.status));
  useEffect(() => {
    if (!hasActive || storeSearch) return;
    const timer = setInterval(() => dispatch(refreshProjects()), DASHBOARD_AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [hasActive, dispatch, storeSearch]);

  const handleLoadMore = useCallback(() => {
    const nextPage = Math.floor(projects.length / DASHBOARD_PAGE_SIZE) + 1;
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

        {/* Sprint 95: stats widget */}
        <DashboardStats />

        {/* Sprint 94: bulk actions */}
        <BulkActionsBar />

        {/* Sort + filter bar */}
        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__sort">
            {[
              { key: 'date',       label: '📅 תאריך' },
              { key: 'status',     label: '🔵 סטטוס' },
              { key: 'completion', label: '📊 התקדמות' },
              { key: 'tokens',     label: '🔢 טוקנים' },
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

        {/* Sprint 92: tag filter chips */}
        {allTags.length > 0 && (
          <div className="dashboard-tag-filters">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-filter-chip${storeTagFilter === tag ? ' tag-filter-chip--active' : ''}`}
                onClick={() => handleTagFilter(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Status filter chips */}
        <div className="dashboard-status-filters">
          {[
            { key: '',           label: t('dashboard.filterAll') },
            { key: 'planning',   label: t('dashboard.status.planning') },
            { key: 'coding',     label: t('dashboard.status.coding') },
            { key: 'live',       label: t('dashboard.status.live') },
            { key: 'failed',     label: t('dashboard.status.failed') },
            { key: 'archived',   label: t('dashboard.status.archived') },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`status-filter-chip${storeStatusFilter === key ? ' status-filter-chip--active' : ''}`}
              onClick={() => handleStatusFilter(key)}
            >
              {label}
            </button>
          ))}
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
            {storeSearch ? (
              <>
                <div className="empty-state__icon">🔍</div>
                <div className="empty-state__title">{`אין תוצאות עבור "${storeSearch}"`}</div>
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
              {projects.map((p) => (
                <ProjectCard
                  key={p._id}
                  project={p}
                  dispatch={dispatch}
                  isSelected={selectedIds.includes(p._id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
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
