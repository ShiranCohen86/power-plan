import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const AGENT_TYPES = [
  'idea_understanding', 'product_discovery', 'market_analysis', 'ux_architecture',
  'tech_architecture', 'system_design', 'database_design', 'ai_agent_system',
  'orchestration', 'dev_planning', 'qa_strategy', 'devops_strategy',
  'db_schema', 'backend_scaffold', 'frontend_scaffold', 'tests', 'config', 'review',
];
const CATEGORIES = ['spec_quality', 'code_quality', 'architecture', 'security', 'ux', 'planning'];
const CATEGORY_COLOR = {
  spec_quality: 'var(--text-info)',    code_quality: 'var(--warning)',  architecture: '#a78bfa',
  security: 'var(--danger)',           ux: '#facc15',                   planning: 'var(--success)',
};

const EMPTY_FORM = { agentType: '', category: '', mistake: '', lesson: '' };

export default function AdminLessons({ lessons, onSave, onToggleActive, onDelete }) {
  const { t } = useTranslation();

  const [showForm,   setShowForm]   = useState(false);
  const [formData,   setFormData]   = useState(EMPTY_FORM);
  const [editId,     setEditId]     = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function field(key) {
    return (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.agentType || !formData.category || !formData.mistake || !formData.lesson) return;
    setSubmitting(true);
    try {
      await onSave(editId, formData);
      setShowForm(false);
      setFormData(EMPTY_FORM);
      setEditId(null);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(lesson) {
    setFormData({ agentType: lesson.agentType, category: lesson.category, mistake: lesson.mistake, lesson: lesson.lesson });
    setEditId(lesson._id);
    setShowForm(true);
  }

  function openAddForm() {
    setFormData(EMPTY_FORM);
    setEditId(null);
    setShowForm(!showForm);
  }

  return (
    <section className="admin-section">
      <div className="admin-section__header">
        <h2 className="admin-section__title">🧠 System Knowledge Base</h2>
        <button
          className="btn btn--primary"
          style={{ minHeight: 32, padding: '4px 16px', fontSize: 13 }}
          onClick={openAddForm}
        >
          {t('admin.addLesson')}
        </button>
      </div>

      {showForm && (
        <form className="admin-lesson-form" onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <label>Agent Type</label>
            <select value={formData.agentType} onChange={field('agentType')} required>
              <option value="">{t('admin.selectPhase')}</option>
              {AGENT_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="admin-form-row">
            <label>Category</label>
            <select value={formData.category} onChange={field('category')} required>
              <option value="">{t('admin.selectPhase')}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="admin-form-row">
            <label>{t('admin.mistakeLabel')}</label>
            <textarea rows={2} value={formData.mistake} onChange={field('mistake')} required
              placeholder="לא הגדרתי SLA עם מספרים ספציפיים..." />
          </div>
          <div className="admin-form-row">
            <label>{t('admin.lessonLabel')}</label>
            <textarea rows={2} value={formData.lesson} onChange={field('lesson')} required
              placeholder="תמיד כלול מספרים ב-Non-Functional Requirements..." />
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? t('workspace.projSettings.saving') : editId ? t('workspace.projSettings.update') : t('admin.addLesson')}
            </button>
            <button type="button" className="btn btn--secondary"
              onClick={() => { setShowForm(false); setEditId(null); }}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {lessons.length === 0 ? (
        <div className="admin-empty">{t('admin.noLessons')}</div>
      ) : (
        <div className="admin-lessons-list">
          {lessons.map((l) => (
            <div key={l._id} className={`admin-lesson-card${l.isActive ? '' : ' admin-lesson-card--inactive'}`}>
              <div className="admin-lesson-card__header">
                <span className="admin-lesson-badge"
                  style={{ background: `${CATEGORY_COLOR[l.category]}22`, color: CATEGORY_COLOR[l.category] }}>
                  {l.category}
                </span>
                <span className="admin-lesson-agent">{l.agentType}</span>
                <span className="admin-lesson-count">×{l.occurrenceCount}</span>
              </div>
              <div className="admin-lesson-mistake">❌ {l.mistake}</div>
              <div className="admin-lesson-text">✅ {l.lesson}</div>
              <div className="admin-lesson-actions">
                <button className="btn-ghost" style={{ fontSize: 12, minHeight: 'auto', padding: '3px 8px' }} onClick={() => startEdit(l)}>
                  {t('workspace.projSettings.update')}
                </button>
                <button className="btn-ghost" style={{ fontSize: 12, minHeight: 'auto', padding: '3px 8px' }} onClick={() => onToggleActive(l)}>
                  {l.isActive ? t('dashboard.status.paused') : t('dashboard.status.live')}
                </button>
                <button className="btn-ghost" style={{ fontSize: 12, minHeight: 'auto', padding: '3px 8px', color: 'var(--danger)' }}
                  onClick={() => onDelete(l._id)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
