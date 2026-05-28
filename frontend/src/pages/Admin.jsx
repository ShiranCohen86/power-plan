import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectCurrentUser } from '../store/slices/authSlice';
import * as adminApi from '../api/admin.api';
import PlatformSetup from '../components/admin/PlatformSetup';

const PHASE_LABELS = {
  idea_understanding:  'Idea Analysis',
  product_discovery:   'Product Discovery',
  market_analysis:     'Market Analysis',
  ux_architecture:     'UX Architecture',
  tech_architecture:   'Tech Architecture',
  system_design:       'System Design',
  database_design:     'DB Design',
  ai_agent_system:     'AI Agent System',
  orchestration:       'Orchestration',
  dev_planning:        'Dev Planning',
  qa_strategy:         'QA Strategy',
  devops_strategy:     'DevOps Strategy',
};

const AGENT_TYPES = [
  'idea_understanding', 'product_discovery', 'market_analysis', 'ux_architecture',
  'tech_architecture', 'system_design', 'database_design', 'ai_agent_system',
  'orchestration', 'dev_planning', 'qa_strategy', 'devops_strategy',
  'db_schema', 'backend_scaffold', 'frontend_scaffold', 'tests', 'config', 'review',
];
const CATEGORIES = ['spec_quality', 'code_quality', 'architecture', 'security', 'ux', 'planning'];

const CATEGORY_COLOR = {
  spec_quality:  '#f472b6',
  code_quality:  '#f97316',
  architecture:  '#a78bfa',
  security:      '#ef4444',
  ux:            '#facc15',
  planning:      '#34d399',
};

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user     = useSelector(selectCurrentUser);

  const [stats,        setStats]        = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [lessons,      setLessons]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [activity,     setActivity]     = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const ACTIVITY_LIMIT = 20;

  // Add lesson form
  const [showForm,    setShowForm]    = useState(false);
  const [formData,    setFormData]    = useState({ agentType: '', category: '', mistake: '', lesson: '' });
  const [submitting,  setSubmitting]  = useState(false);
  const [editId,      setEditId]      = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return; }
    load();
  }, [user]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.agentType || !formData.category || !formData.mistake || !formData.lesson) return;
    setSubmitting(true);
    try {
      if (editId) {
        const updated = await adminApi.updateLesson(editId, formData);
        setLessons((prev) => prev.map((l) => l._id === editId ? updated : l));
      } else {
        const created = await adminApi.createLesson(formData);
        setLessons((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setFormData({ agentType: '', category: '', mistake: '', lesson: '' });
      setEditId(null);
    } catch {
      setError('Failed to save lesson');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(lesson) {
    setFormData({ agentType: lesson.agentType, category: lesson.category, mistake: lesson.mistake, lesson: lesson.lesson });
    setEditId(lesson._id);
    setShowForm(true);
  }

  async function toggleActive(lesson) {
    try {
      const updated = await adminApi.updateLesson(lesson._id, { isActive: !lesson.isActive });
      setLessons((prev) => prev.map((l) => l._id === lesson._id ? updated : l));
    } catch {
      setError(t('admin.errorUpdate'));
    }
  }

  async function deleteLesson(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await adminApi.deleteLesson(id);
      setLessons((prev) => prev.filter((l) => l._id !== id));
    } catch {
      setError(t('admin.errorDelete'));
    }
  }

  if (loading) return <div className="workspace-loading"><div className="pwa-spinner" /></div>;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button className="btn-ghost" onClick={() => navigate('/dashboard')} style={{ minHeight: 36 }}>{t('admin.back')}</button>
        <h1 className="admin-topbar__title">{t('admin.title')}</h1>
      </header>

      {error && (
        <div className="alert alert--error" style={{ margin: '16px 24px', cursor: 'pointer' }} onClick={() => setError('')}>
          {error} ✕
        </div>
      )}

      <main className="admin-main">
        {/* Platform Setup */}
        <PlatformSetup />

        {/* Stats */}
        <section className="admin-section">
          <h2 className="admin-section__title">📊 Platform Stats</h2>
          <div className="admin-stats-grid">
            <StatCard icon="👤" label={t('admin.users')}         value={stats?.users} />
            <StatCard icon="📁" label={t('admin.projects')}     value={stats?.projects} />
            <StatCard icon="🌐" label={t('admin.liveApps')}     value={stats?.liveProjects} />
            <StatCard icon="📄" label={t('admin.files')}        value={stats?.generatedFiles} />
            <StatCard icon="🧠" label={t('admin.lessons')}      value={stats?.activeLessons} />
          </div>
        </section>

        {/* Analytics */}
        {analytics && (
          <section className="admin-section">
            <h2 className="admin-section__title">📈 Pipeline Analytics</h2>
            <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
              <StatCard icon="✅" label={t('admin.completionRate')} value={`${analytics.completionRate}%`} />
              <StatCard icon="🌐" label={t('admin.liveAppsRate')} value={analytics.liveProjects} />
              <StatCard icon="❌" label={t('admin.failedProjects')} value={analytics.failedProjects} />
              <StatCard icon="📁" label={t('admin.totalProjects')} value={analytics.totalProjects} />
            </div>

            {analytics.avgTokensByPhase?.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                  {t('admin.avgTokens')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analytics.avgTokensByPhase.map((p) => {
                    const maxTokens = analytics.avgTokensByPhase[0]?.avgTokens || 1;
                    const pct = Math.round((p.avgTokens / maxTokens) * 100);
                    return (
                      <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span style={{ width: 160, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                          {PHASE_LABELS[p._id] || p._id}
                        </span>
                        <div style={{ flex: 1, background: 'var(--surface-2, #1e1e2e)', borderRadius: 4, height: 8 }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'var(--brand-primary, #7c3aed)' }} />
                        </div>
                        <span style={{ width: 70, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                          {Math.round(p.avgTokens).toLocaleString()}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>×{p.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Lessons */}
        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">🧠 System Knowledge Base</h2>
            <button className="btn btn--primary" style={{ minHeight: 32, padding: '4px 16px', fontSize: 13 }}
              onClick={() => { setShowForm(!showForm); setEditId(null); setFormData({ agentType: '', category: '', mistake: '', lesson: '' }); }}>
              {t('admin.addLesson')}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <form className="admin-lesson-form" onSubmit={handleSubmit}>
              <div className="admin-form-row">
                <label>Agent Type</label>
                <select value={formData.agentType} onChange={(e) => setFormData((f) => ({ ...f, agentType: e.target.value }))} required>
                  <option value="">{t('admin.selectPhase')}</option>
                  {AGENT_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label>Category</label>
                <select value={formData.category} onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))} required>
                  <option value="">{t('admin.selectPhase')}</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label>{t('admin.mistakeLabel')}</label>
                <textarea rows={2} value={formData.mistake} onChange={(e) => setFormData((f) => ({ ...f, mistake: e.target.value }))} required placeholder="לא הגדרתי SLA עם מספרים ספציפיים..." />
              </div>
              <div className="admin-form-row">
                <label>{t('admin.lessonLabel')}</label>
                <textarea rows={2} value={formData.lesson} onChange={(e) => setFormData((f) => ({ ...f, lesson: e.target.value }))} required placeholder="תמיד כלול מספרים ב-Non-Functional Requirements..." />
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? t('workspace.projSettings.saving') : editId ? t('workspace.projSettings.update') : t('admin.addLesson')}
                </button>
                <button type="button" className="btn btn--secondary"
                  onClick={() => { setShowForm(false); setEditId(null); }}>{t('common.cancel')}</button>
              </div>
            </form>
          )}

          {/* List */}
          {lessons.length === 0 ? (
            <div className="admin-empty">{t('admin.noLessons')}</div>
          ) : (
            <div className="admin-lessons-list">
              {lessons.map((l) => (
                <div key={l._id} className={`admin-lesson-card${l.isActive ? '' : ' admin-lesson-card--inactive'}`}>
                  <div className="admin-lesson-card__header">
                    <span className="admin-lesson-badge" style={{ background: `${CATEGORY_COLOR[l.category]}22`, color: CATEGORY_COLOR[l.category] }}>
                      {l.category}
                    </span>
                    <span className="admin-lesson-agent">{l.agentType}</span>
                    <span className="admin-lesson-count">×{l.occurrenceCount}</span>
                  </div>
                  <div className="admin-lesson-mistake">❌ {l.mistake}</div>
                  <div className="admin-lesson-text">✅ {l.lesson}</div>
                  <div className="admin-lesson-actions">
                    <button className="btn-ghost" style={{ fontSize: 12, minHeight: 'auto', padding: '3px 8px' }} onClick={() => startEdit(l)}>{t('workspace.projSettings.update')}</button>
                    <button className="btn-ghost" style={{ fontSize: 12, minHeight: 'auto', padding: '3px 8px' }} onClick={() => toggleActive(l)}>
                      {l.isActive ? t('dashboard.status.paused') : t('dashboard.status.live')}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 12, minHeight: 'auto', padding: '3px 8px', color: '#ef4444' }} onClick={() => deleteLesson(l._id)}>{t('common.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity — paginated */}
        {activity.length > 0 && (
          <section className="admin-section">
            <h2 className="admin-section__title">
              {t('admin.recentActivity')}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>({activityTotal} סה"כ)</span>
            </h2>
            <div className="admin-activity">
              {activity.map((log, i) => (
                <div key={i} className="admin-activity-row">
                  <span className="admin-activity-agent">{log.agentName}</span>
                  <span className="admin-activity-event">{log.event}</span>
                  <span className="admin-activity-time">{new Date(log.timestamp).toLocaleTimeString('he-IL')}</span>
                </div>
              ))}
            </div>
            {activityTotal > ACTIVITY_LIMIT && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, justifyContent: 'center' }}>
                <button
                  className="btn btn--secondary"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  disabled={activityPage <= 1}
                  onClick={() => loadActivityPage(activityPage - 1)}
                >
                  ← הקודם
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  עמוד {activityPage} / {Math.ceil(activityTotal / ACTIVITY_LIMIT)}
                </span>
                <button
                  className="btn btn--secondary"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  disabled={activityPage >= Math.ceil(activityTotal / ACTIVITY_LIMIT)}
                  onClick={() => loadActivityPage(activityPage + 1)}
                >
                  הבא →
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
