import { useState, useEffect } from 'react';
import {
  getSettings, updatePlan, updateApiKey, deleteApiKey,
  updateGithubToken, deleteGithubToken, updateRenderToken, deleteRenderToken,
  validateApiKey,
} from '../api/settings.api';

const PLANS = [
  {
    key:   'starter',
    name:  'Starter',
    price: 'חינם לחלוטין',
    badge: null,
    color: '#6b7280',
    highlight: false,
    tagline: 'הכי משתלם — אתה משלם ישירות לאנתרופיק',
    description: 'תשתמש במפתח API אישי שלך מאנתרופיק. Power Plan לא גובה כלום — אנתרופיק גובה ממך ישירות לפי שימוש (בערך ₪1-5 לפרויקט).',
    features: [
      { label: '12 שלבי תכנון מלאים', included: true },
      { label: 'קוד מוכן לפריסה', included: true },
      { label: 'פגישות צוות AI (Meeting System)', included: false, note: 'ב-Pro בלבד' },
      { label: 'ביקורת יועצים חיצוניים', included: false, note: 'ב-Pro בלבד' },
      { label: 'ציון איכות האפיון', included: false, note: 'ב-Pro בלבד' },
      { label: 'מודל AI מהיר (Claude Haiku)', included: true },
    ],
    requiresKey: true,
  },
  {
    key:   'pro',
    name:  'Pro',
    price: '₪99 / חודש',
    badge: 'הכי פופולרי',
    color: '#7c3aed',
    highlight: true,
    tagline: 'תוצאות הטובות ביותר — ללא עסקה עם אנתרופיק',
    description: 'Power Plan מנהלת את כל ה-AI בשבילך. לא צריך להירשם לאנתרופיק, לא צריך להבין API — פשוט מתחיל לבנות.',
    features: [
      { label: '12 שלבי תכנון מלאים', included: true },
      { label: 'קוד מוכן לפריסה', included: true },
      { label: 'פגישות צוות AI (Meeting System)', included: true },
      { label: 'ביקורת יועצים חיצוניים', included: true },
      { label: 'ציון איכות האפיון', included: true },
      { label: 'מודל AI חזק יותר (Claude Sonnet)', included: true },
    ],
    requiresKey: false,
  },
];

function PlanCard({ plan, currentPlan, hasApiKey, onSelect, loading }) {
  const isActive  = currentPlan === plan.key;
  const canSelect = plan.key === 'pro' || hasApiKey;

  return (
    <div className={`settings-plan-card${plan.highlight ? ' settings-plan-card--highlight' : ''}${isActive ? ' settings-plan-card--active' : ''}`}>
      {plan.badge && <div className="settings-plan-card__badge">{plan.badge}</div>}

      <div className="settings-plan-card__header">
        <h3 className="settings-plan-card__name">{plan.name}</h3>
        <div className="settings-plan-card__price">{plan.price}</div>
        <p className="settings-plan-card__tagline">{plan.tagline}</p>
      </div>

      <p className="settings-plan-card__desc">{plan.description}</p>

      <ul className="settings-plan-card__features">
        {plan.features.map((f, i) => (
          <li key={i} className={`settings-plan-card__feature${f.included ? '' : ' settings-plan-card__feature--off'}`}>
            <span className="settings-plan-card__feature-icon">{f.included ? '✓' : '✗'}</span>
            <span>{f.label}</span>
            {f.note && <span className="settings-plan-card__feature-note">{f.note}</span>}
          </li>
        ))}
      </ul>

      {isActive ? (
        <div className="settings-plan-card__current-badge">התוכנית הנוכחית שלך</div>
      ) : (
        <button
          className={`btn settings-plan-card__cta${plan.highlight ? ' btn--primary' : ' btn--secondary'}`}
          onClick={() => onSelect(plan.key)}
          disabled={loading || (!canSelect && plan.requiresKey)}
        >
          {plan.requiresKey && !hasApiKey
            ? 'הזן מפתח Anthropic קודם ↓'
            : loading ? 'מחליף...' : `עבור ל-${plan.name}`}
        </button>
      )}
    </div>
  );
}

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
  const [settings,    setSettings]    = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError,   setPlanError]   = useState('');
  const [loadError,   setLoadError]   = useState('');

  useEffect(() => {
    getSettings()
      .then((res) => setSettings(res))
      .catch(() => setLoadError('לא ניתן לטעון הגדרות. נסה לרענן.'));
  }, []);

  // After key is configured we know the user came from onboarding — show CTA
  const readyToBuild = settings?.hasApiKey;

  async function handleSelectPlan(plan) {
    setPlanLoading(true); setPlanError('');
    try {
      const res = await updatePlan(plan);
      setSettings((s) => ({ ...s, plan: res.plan }));
    } catch (err) {
      setPlanError(err.message || 'שגיאה בשינוי תוכנית');
    } finally {
      setPlanLoading(false);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-page__heading">
        <h1 className="settings-page__title">⚙ הגדרות חשבון</h1>
      </div>

      {loadError && <div className="settings-page__load-error">{loadError}</div>}

      {!settings && !loadError && (
        <div className="settings-page__loading"><div className="spinner" /></div>
      )}

      {settings && !settings.hasApiKey && (
        <div className="settings-onboarding-hint">
          <span>👋</span>
          <span>ברוך הבא! לפני שמתחילים לבנות, הזן את מפתח ה-AI שלך למטה. זה הדבר היחידי שנדרש כדי להתחיל.</span>
        </div>
      )}

      {readyToBuild && (
        <div className="settings-ready-cta">
          <span className="settings-ready-cta__icon">✅</span>
          <div>
            <strong>הכל מוכן!</strong>
            <span> מפתח ה-AI מוגדר — אפשר להתחיל לבנות.</span>
          </div>
          <a href="/new-project" className="btn btn--primary">
            התחל לבנות אפליקציה →
          </a>
        </div>
      )}

      {settings && (
        <div className="settings-page__body">
          <section className="settings-section">
            <h2 className="settings-section__title">בחר תוכנית</h2>
            <p className="settings-section__desc">
              בשתי התוכניות תקבל אפיון מלא וקוד עובד — ההבדל הוא <strong>מי מספק את ה-AI</strong>.
            </p>
            {planError && <p className="settings-plan__error">{planError}</p>}
            <div className="settings-plans">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  currentPlan={settings.plan}
                  hasApiKey={settings.hasApiKey}
                  onSelect={handleSelectPlan}
                  loading={planLoading}
                />
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">קודי גישה לשירותים</h2>
            <p className="settings-section__desc">
              כל אחד מהשירותים הבאים נדרש בשלב מסוים בבניית האפליקציה שלך.
              Power Plan תבקש אותם בדיוק כשצריך — לא לפני.
            </p>

            <TokenSection
              title="מפתח AI אישי (Anthropic)"
              subtitle="נדרש לפני שלב הניתוח — מאפשר ל-Power Plan לדבר עם Claude בשמך."
              hint={settings.apiKeyHint}
              hasToken={settings.hasApiKey}
              onValidate={(key) => validateApiKey(key)}
              onSave={async (v) => {
                const res = await updateApiKey(v);
                setSettings((s) => ({ ...s, hasApiKey: res.hasApiKey, apiKeyHint: res.apiKeyHint }));
              }}
              onDelete={async () => {
                const res = await deleteApiKey();
                setSettings((s) => ({ ...s, hasApiKey: false, apiKeyHint: null, plan: res.plan }));
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

            <TokenSection
              title="קוד גישה ל-GitHub"
              subtitle="נדרש לפני שלב הקוד — מאפשר לנו לשמור את הקוד של האפליקציה שלך ב-GitHub."
              hint={settings.githubTokenHint}
              hasToken={settings.hasGithubToken}
              onSave={async (v) => {
                const res = await updateGithubToken(v);
                setSettings((s) => ({ ...s, hasGithubToken: res.hasGithubToken, githubTokenHint: res.githubTokenHint }));
              }}
              onDelete={async () => {
                await deleteGithubToken();
                setSettings((s) => ({ ...s, hasGithubToken: false, githubTokenHint: null }));
              }}
              inputProps={{
                placeholder: 'ghp_...',
                howto: {
                  title: 'איך מקבלים קוד גישה ל-GitHub?',
                  steps: [
                    'היכנס ל-<strong>github.com</strong> (צור חשבון חינמי אם אין לך)',
                    'לחץ על התמונה שלך (פינה ימנית עליונה) → Settings',
                    'גלול למטה → "Developer settings" → "Personal access tokens" → "Tokens (classic)"',
                    'לחץ "Generate new token (classic)" → בחר scope: <code>repo</code> בלבד',
                    'העתק את הtoken (מתחיל ב-<code>ghp_</code>) והדבק כאן',
                  ],
                  note: '💡 GitHub חינמי לחלוטין — הקוד שלך יישמר ב-repo פרטי.',
                },
              }}
            />

            <TokenSection
              title="קוד גישה ל-Render (פריסה)"
              subtitle="נדרש לפני שלב הפריסה — מאפשר לנו להעלות את האפליקציה לאינטרנט בשמך."
              hint={settings.renderTokenHint}
              hasToken={settings.hasRenderToken}
              onSave={async (v) => {
                const res = await updateRenderToken(v);
                setSettings((s) => ({ ...s, hasRenderToken: res.hasRenderToken, renderTokenHint: res.renderTokenHint }));
              }}
              onDelete={async () => {
                await deleteRenderToken();
                setSettings((s) => ({ ...s, hasRenderToken: false, renderTokenHint: null }));
              }}
              inputProps={{
                placeholder: 'rnd_...',
                howto: {
                  title: 'איך מקבלים קוד גישה ל-Render?',
                  steps: [
                    'היכנס לאתר <strong>render.com</strong> (צור חשבון חינמי אם אין לך)',
                    'לחץ על "Account Settings" בתפריט הצד',
                    'לחץ על "API Keys" ואז "Create API Key"',
                    'תן לו שם (למשל: "Power Plan") ולחץ "Create"',
                    'העתק את ה-API key (מתחיל ב-<code>rnd_</code>) והדבק כאן',
                  ],
                  note: '💡 Render מציע tier חינמי — האפליקציה שלך תרוץ בחינם.',
                },
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
