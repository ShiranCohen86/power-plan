import { useState, useEffect } from 'react';
import {
  getSettings, updateApiKey, deleteApiKey, validateApiKey,
} from '../api/settings.api';

function TokenSection({ title, subtitle, hint, hasToken, onSave, onDelete, saving, saveError, inputProps, onValidate }) {
  const [mode, setMode]         = useState('idle');
  const [value, setValue]       = useState('');
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [validating, setValidating] = useState(false);
  const [validResult, setValidResult] = useState(null); // null | { valid, error }

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

  async function handleValidate() {
    if (!value.trim() || !onValidate) return;
    setValidating(true); setValidResult(null);
    try {
      const res = await onValidate(value.trim());
      setValidResult(res);
    } catch {
      setValidResult({ valid: false, error: 'שגיאת רשת — נסה שוב' });
    } finally { setValidating(false); }
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
    <div className="settings-apikey">
      <div className="settings-apikey__header">
        <div>
          <h3 className="settings-apikey__title">{title}</h3>
          <p className="settings-apikey__subtitle">{subtitle}</p>
        </div>
        <div className={`settings-apikey__status${hasToken ? ' settings-apikey__status--ok' : ''}`}>
          {hasToken ? '✓ מוגדר' : 'לא מוגדר'}
        </div>
      </div>

      {hasToken && mode === 'idle' && (
        <div className="settings-apikey__current">
          <span className="settings-apikey__hint">{hint}</span>
          <div className="settings-apikey__actions">
            <button className="btn btn--secondary" onClick={() => setMode('editing')}>עדכן</button>
            <button className="btn settings-apikey__delete-btn" onClick={() => setMode('deleting')}>מחק</button>
          </div>
        </div>
      )}

      {!hasToken && mode === 'idle' && (
        <button className="btn btn--primary" onClick={() => setMode('editing')}>+ הזן קוד גישה</button>
      )}

      {mode === 'editing' && (
        <div className="settings-apikey__form">
          {inputProps?.howto && (
            <div className="settings-apikey__howto">
              <p className="settings-apikey__howto-title">{inputProps.howto.title}</p>
              <ol className="settings-apikey__howto-steps">
                {inputProps.howto.steps.map((s, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: s }} />
                ))}
              </ol>
              {inputProps.howto.note && (
                <p className="settings-apikey__howto-cost">{inputProps.howto.note}</p>
              )}
            </div>
          )}
          <input
            type="password"
            className="settings-apikey__input"
            placeholder={inputProps?.placeholder || ''}
            value={value}
            onChange={(e) => { setValue(e.target.value); setValidResult(null); }}
            autoComplete="off"
            dir="ltr"
          />
          {err && <p className="settings-apikey__error">{err}</p>}
          {validResult && (
            <p style={{ fontSize: 13, marginTop: 6, color: validResult.valid ? 'var(--success, #16a34a)' : 'var(--danger)' }}>
              {validResult.valid ? '✓ המפתח תקין ועובד' : `✗ ${validResult.error}`}
            </p>
          )}
          <div className="settings-apikey__form-actions">
            {onValidate && (
              <button
                className="btn btn--secondary"
                onClick={handleValidate}
                disabled={validating || !value.trim()}
                style={{ fontSize: 13 }}
              >
                {validating ? 'בודק...' : '🔍 בדוק מפתח'}
              </button>
            )}
            <button className="btn btn--primary" onClick={handleSave} disabled={busy || !value.trim()}>
              {busy ? 'שומר...' : 'שמור'}
            </button>
            <button className="btn btn--secondary" onClick={() => { setMode('idle'); setValue(''); setErr(''); setValidResult(null); }}>
              ביטול
            </button>
          </div>
        </div>
      )}

      {mode === 'deleting' && (
        <div className="settings-apikey__confirm-delete">
          <p>למחוק את קוד הגישה?</p>
          {err && <p className="settings-apikey__error">{err}</p>}
          <div className="settings-apikey__form-actions">
            <button className="btn settings-apikey__delete-btn" onClick={handleDelete} disabled={busy}>
              {busy ? 'מוחק...' : 'כן, מחק'}
            </button>
            <button className="btn btn--secondary" onClick={() => setMode('idle')}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [settings,  setSettings]  = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getSettings()
      .then((res) => setSettings(res))
      .catch(() => setLoadError('לא ניתן לטעון הגדרות. נסה לרענן.'));
  }, []);

  return (
    <div className="settings-page">
      <div className="settings-page__heading">
        <h1 className="settings-page__title">⚙ הגדרות חשבון</h1>
      </div>

      {loadError && <div className="settings-page__load-error">{loadError}</div>}

      {!settings && !loadError && (
        <div className="settings-page__loading"><div className="pwa-spinner" /></div>
      )}

      {settings && !settings.hasApiKey && (
        <div className="settings-onboarding-hint">
          <span>👋</span>
          <span>ברוך הבא! לפני שמתחילים לבנות, הזן את מפתח ה-AI שלך למטה. זה הדבר היחידי שנדרש כדי להתחיל.</span>
        </div>
      )}

      {settings?.hasApiKey && (
        <div className="settings-ready-cta">
          <span className="settings-ready-cta__icon">✅</span>
          <div>
            <strong>הכל מוכן!</strong>
            <span> מפתח ה-AI מוגדר — אפשר להתחיל לבנות.</span>
          </div>
          <a href="/new-project" className="btn btn--primary">התחל לבנות אפליקציה →</a>
        </div>
      )}

      {settings && (
        <div className="settings-page__body">
          <section className="settings-section">
            <h2 className="settings-section__title">מפתח AI (Anthropic)</h2>
            <p className="settings-section__desc">
              מפתח אחד משמש את <strong>כל הפרויקטים</strong> שלך.
              קודי גישה ל-GitHub ו-Render מוגדרים בנפרד לכל פרויקט — דרך כפתור ⚙️ הגדרות בסביבת הפרויקט.
            </p>

            <TokenSection
              title="מפתח AI אישי (Anthropic)"
              subtitle="מאפשר ל-Power Plan לדבר עם Claude בשמך — משמש לכל הפרויקטים."
              hint={settings.apiKeyHint}
              hasToken={settings.hasApiKey}
              onValidate={(key) => validateApiKey(key)}
              onSave={async (v) => {
                const res = await updateApiKey(v);
                setSettings((s) => ({ ...s, hasApiKey: res.hasApiKey, apiKeyHint: res.apiKeyHint }));
              }}
              onDelete={async () => {
                const res = await deleteApiKey();
                setSettings((s) => ({ ...s, hasApiKey: false, apiKeyHint: null }));
              }}
              inputProps={{
                placeholder: 'sk-ant-api03-...',
                howto: {
                  title: 'איך מקבלים מפתח Anthropic?',
                  steps: [
                    'היכנס לאתר <strong>console.anthropic.com</strong>',
                    'לחץ על "API Keys" בתפריט הצד',
                    'לחץ "Create Key" ותן לו שם (למשל: "Power Plan")',
                    'העתק את המפתח (מתחיל ב-<code>sk-ant-</code>) והדבק כאן',
                  ],
                  note: '💡 כל פרויקט שלם עולה בערך ₪1-5 — חיוב לפי שימוש בלבד.',
                },
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
