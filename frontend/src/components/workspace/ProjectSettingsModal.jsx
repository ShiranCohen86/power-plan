import { useState, useEffect } from 'react';
import {
  getProjectSettings,
  setProjectApiKey, deleteProjectApiKey,
  setProjectGithubToken, deleteProjectGithubToken,
  setProjectRenderToken, deleteProjectRenderToken,
} from '../../api/projects.api';
import { validateApiKey } from '../../api/settings.api';

function TokenRow({ title, subtitle, hint, hasToken, onSave, onDelete, placeholder, onValidate }) {
  const [mode, setMode]               = useState('idle');
  const [value, setValue]             = useState('');
  const [busy, setBusy]               = useState(false);
  const [err, setErr]                 = useState('');
  const [validating, setValidating]   = useState(false);
  const [validResult, setValidResult] = useState(null);

  async function handleSave() {
    if (!value.trim()) return;
    setBusy(true); setErr('');
    try {
      await onSave(value.trim());
      setMode('idle'); setValue(''); setValidResult(null);
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

  async function handleValidate() {
    if (!value.trim() || !onValidate) return;
    setValidating(true); setValidResult(null);
    try {
      const res = await onValidate(value.trim());
      setValidResult(res);
    } catch {
      setValidResult({ valid: false, error: 'שגיאת רשת' });
    } finally { setValidating(false); }
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
            onChange={(e) => { setValue(e.target.value); setValidResult(null); }}
            autoComplete="off"
            dir="ltr"
            style={{ fontSize: 13 }}
          />
          {err && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{err}</p>}
          {validResult && (
            <p style={{ margin: 0, fontSize: 12, color: validResult.valid ? '#16a34a' : 'var(--danger)' }}>
              {validResult.valid ? '✓ המפתח תקין' : `✗ ${validResult.error}`}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {onValidate && (
              <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={handleValidate} disabled={validating || !value.trim()}>
                {validating ? 'בודק...' : '🔍 בדוק'}
              </button>
            )}
            <button className="btn btn--primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={busy || !value.trim()}>
              {busy ? 'שומר...' : 'שמור'}
            </button>
            <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => { setMode('idle'); setValue(''); setErr(''); setValidResult(null); }}>
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

export default function ProjectSettingsModal({ projectId, projectTitle, onClose, onKeyUpdated }) {
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
                קודי גישה ברמת הפרויקט מקבלים עדיפות על קודי הגישה הגלובליים שלך.
                השאר ריק כדי להשתמש בקוד הגלובלי.
              </p>

              <TokenRow
                title="מפתח AI (Anthropic)"
                subtitle="עדיפות על המפתח הגלובלי שלך"
                hint={settings.apiKeyHint}
                hasToken={settings.hasApiKey && !settings.usingFallback}
                onValidate={(key) => validateApiKey(key)}
                onSave={async (v) => {
                  const res = await setProjectApiKey(projectId, v);
                  setSettings((s) => ({ ...s, hasApiKey: true, usingFallback: false, apiKeyHint: res.apiKeyHint }));
                  onKeyUpdated?.();
                }}
                onDelete={async () => {
                  await deleteProjectApiKey(projectId);
                  setSettings((s) => ({ ...s, hasApiKey: false, usingFallback: false, apiKeyHint: null }));
                }}
                placeholder="sk-ant-api03-..."
              />

              <TokenRow
                title="קוד גישה ל-GitHub"
                subtitle="מאפשר שמירת קוד הפרויקט ב-repo נפרד"
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
                subtitle="מאפשר פריסה לכתובת ייעודית לפרויקט"
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
