import { useState, useEffect } from 'react';
import {
  getProjectSettings,
  setProjectGithubToken, deleteProjectGithubToken,
  setProjectRenderToken, deleteProjectRenderToken,
} from '../../api/projects.api';

function TokenRow({ title, subtitle, hint, hasToken, onSave, onDelete, placeholder }) {
  const [mode, setMode] = useState('idle');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    if (!value.trim()) return;
    setBusy(true); setErr('');
    try {
      await onSave(value.trim());
      setMode('idle'); setValue('');
    } catch (e) {
      setErr(e.message || 'שגיאה בשמירה');
    } finally { setBusy(false); }
  }

  async function handleDelete() {
    setBusy(true); setErr('');
    try {
      await onDelete();
      setMode('idle');
    } catch (e) {
      setErr(e.message || 'שגיאה במחיקה');
    } finally { setBusy(false); }
  }

  return (
    <div className="proj-settings-row">
      <div className="proj-settings-row__header">
        <div>
          <div className="proj-settings-row__title">{title}</div>
          <div className="proj-settings-row__subtitle">{subtitle}</div>
        </div>
        <span className={`proj-settings-row__status${hasToken ? ' proj-settings-row__status--ok' : ''}`}>
          {hasToken ? '✓ מוגדר' : 'לא מוגדר'}
        </span>
      </div>

      {hasToken && hint && mode === 'idle' && (
        <div className="proj-settings-row__hint">{hint}</div>
      )}

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => setMode('editing')}>
            {hasToken ? 'עדכן' : '+ הזן'}
          </button>
          {hasToken && (
            <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => setMode('deleting')}>
              מחק
            </button>
          )}
        </div>
      )}

      {mode === 'editing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="password"
            className="form-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            dir="ltr"
            style={{ fontSize: 13 }}
          />
          {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={busy || !value.trim()}>
              {busy ? 'שומר...' : 'שמור'}
            </button>
            <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => { setMode('idle'); setValue(''); setErr(''); }}>
              ביטול
            </button>
          </div>
        </div>
      )}

      {mode === 'deleting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>למחוק את קוד הגישה?</p>
          {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={handleDelete} disabled={busy}>
              {busy ? 'מוחק...' : 'כן, מחק'}
            </button>
            <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => setMode('idle')}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectSettingsModal({ projectId, projectTitle, onClose }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState('');

  useEffect(() => {
    getProjectSettings(projectId)
      .then(setSettings)
      .catch(() => setLoadErr('לא ניתן לטעון הגדרות פרויקט'))
      .finally(() => setLoading(false));
  }, [projectId]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="proj-settings-overlay" onClick={handleOverlayClick}>
      <div className="proj-settings-modal">
        <div className="proj-settings-modal__header">
          <div>
            <div className="proj-settings-modal__title">⚙️ הגדרות פרויקט</div>
            {projectTitle && (
              <div className="proj-settings-modal__subtitle">{projectTitle}</div>
            )}
          </div>
          <button className="proj-settings-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="proj-settings-modal__body">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="pwa-spinner" />
            </div>
          )}

          {loadErr && (
            <p style={{ color: 'var(--danger)', padding: 16 }}>{loadErr}</p>
          )}

          {settings && (
            <>
              <p className="proj-settings-modal__desc">
                קודי גישה ייעודיים לפרויקט זה — כל פרויקט יכול להיות מחובר לrepo ולשירות פריסה נפרדים.
              </p>

              <div className="proj-settings-modal__global-note">
                🔑 מפתח ה-AI (Anthropic) הוא גלובלי לכל הפרויקטים —
                {' '}<a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>ניהול בהגדרות חשבון</a>
              </div>

              <TokenRow
                title="קוד גישה ל-GitHub"
                subtitle="שמירת הקוד של הפרויקט ב-repo פרטי בחשבון שלך"
                hint={settings.githubTokenHint}
                hasToken={settings.hasGithubToken}
                onSave={async (v) => {
                  const res = await setProjectGithubToken(projectId, v);
                  setSettings((s) => ({ ...s, hasGithubToken: true, githubTokenHint: res.githubTokenHint }));
                }}
                onDelete={async () => {
                  await deleteProjectGithubToken(projectId);
                  setSettings((s) => ({ ...s, hasGithubToken: false, githubTokenHint: null }));
                }}
                placeholder="ghp_..."
              />

              <TokenRow
                title="קוד גישה ל-Render"
                subtitle="פריסת הפרויקט לכתובת ייעודית באינטרנט"
                hint={settings.renderTokenHint}
                hasToken={settings.hasRenderToken}
                onSave={async (v) => {
                  const res = await setProjectRenderToken(projectId, v);
                  setSettings((s) => ({ ...s, hasRenderToken: true, renderTokenHint: res.renderTokenHint }));
                }}
                onDelete={async () => {
                  await deleteProjectRenderToken(projectId);
                  setSettings((s) => ({ ...s, hasRenderToken: false, renderTokenHint: null }));
                }}
                placeholder="rnd_..."
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
