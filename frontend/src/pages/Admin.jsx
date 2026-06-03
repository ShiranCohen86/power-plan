import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectCurrentUser } from '../store/slices/authSlice';
import * as adminApi from '../api/admin.api';
import { ADMIN_ACTIVITY_PAGE_SIZE } from '../config/constants';
import PlatformSetup         from '../components/admin/PlatformSetup';
import AdminAnalytics        from '../components/admin/AdminAnalytics';
import AdminLessons          from '../components/admin/AdminLessons';
import AdminActivity         from '../components/admin/AdminActivity';
import AdminUsers            from '../components/admin/AdminUsers';
import ProductionReadiness   from '../components/admin/ProductionReadiness.jsx';

const ACTIVITY_LIMIT = ADMIN_ACTIVITY_PAGE_SIZE;

function StatCard({ label, value, icon }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat__icon">{icon}</div>
      <div className="admin-stat__value">{value ?? '—'}</div>
      <div className="admin-stat__label">{label}</div>
    </div>
  );
}

export default function Admin() {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const user     = useSelector(selectCurrentUser);

  const [stats,         setStats]         = useState(null);
  const [analytics,     setAnalytics]     = useState(null);
  const [lessons,       setLessons]       = useState([]);
  const [activity,      setActivity]      = useState([]);
  const [activityPage,  setActivityPage]  = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return; }
    load();
  // intentional: admin check and initial load — only run when user identity changes
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const [statsRes, analyticsRes, lessonsRes, activityRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getAnalytics().catch(() => null),
        adminApi.getLessons(),
        adminApi.getActivity({ page: 1, limit: ACTIVITY_LIMIT }).catch(() => null),
      ]);
      setStats(statsRes);
      setAnalytics(analyticsRes);
      setLessons(lessonsRes.lessons);
      if (activityRes) {
        setActivity(activityRes.items);
        setActivityTotal(activityRes.total);
        setActivityPage(1);
      }
    } catch {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function loadActivityPage(page) {
    try {
      const res = await adminApi.getActivity({ page, limit: ACTIVITY_LIMIT });
      setActivity(res.items);
      setActivityTotal(res.total);
      setActivityPage(page);
    } catch { /* non-fatal */ }
  }

  async function handleLessonSave(editId, formData) {
    if (editId) {
      const updated = await adminApi.updateLesson(editId, formData);
      setLessons((prev) => prev.map((l) => l._id === editId ? updated : l));
    } else {
      const created = await adminApi.createLesson(formData);
      setLessons((prev) => [created, ...prev]);
    }
  }

  async function handleLessonToggle(lesson) {
    try {
      const updated = await adminApi.updateLesson(lesson._id, { isActive: !lesson.isActive });
      setLessons((prev) => prev.map((l) => l._id === lesson._id ? updated : l));
    } catch { setError(t('admin.errorUpdate')); }
  }

  async function handleLessonDelete(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await adminApi.deleteLesson(id);
      setLessons((prev) => prev.filter((l) => l._id !== id));
    } catch { setError(t('admin.errorDelete')); }
  }

  if (loading) return <div className="workspace-loading"><div className="pwa-spinner" /></div>;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button className="btn-ghost" onClick={() => navigate('/dashboard')} style={{ minHeight: 36 }}>
          {t('admin.back')}
        </button>
        <h1 className="admin-topbar__title">{t('admin.title')}</h1>
      </header>

      {error && (
        <div className="alert alert--error" style={{ margin: '16px 24px', cursor: 'pointer' }} onClick={() => setError('')}>
          {error} ✕
        </div>
      )}

      <main className="admin-main">
        {/* S150: production readiness */}
        <ProductionReadiness />

        <PlatformSetup />

        <section className="admin-section">
          <h2 className="admin-section__title">📊 Platform Stats</h2>
          <div className="admin-stats-grid">
            <StatCard icon="👤" label={t('admin.users')}     value={stats?.users} />
            <StatCard icon="📁" label={t('admin.projects')}  value={stats?.projects} />
            <StatCard icon="🌐" label={t('admin.liveApps')}  value={stats?.liveProjects} />
            <StatCard icon="📄" label={t('admin.files')}     value={stats?.generatedFiles} />
            <StatCard icon="🧠" label={t('admin.lessons')}   value={stats?.activeLessons} />
          </div>
        </section>

        <AdminAnalytics analytics={analytics} />

        <AdminLessons
          lessons={lessons}
          onSave={handleLessonSave}
          onToggleActive={handleLessonToggle}
          onDelete={handleLessonDelete}
        />

        <AdminUsers />

        <AdminActivity
          activity={activity}
          activityPage={activityPage}
          activityTotal={activityTotal}
          onPageChange={loadActivityPage}
        />
      </main>
    </div>
  );
}
