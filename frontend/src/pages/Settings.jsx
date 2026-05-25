import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, updatePlan, updateApiKey, deleteApiKey } from '../api/settings.api';

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
      { label: 'מסד נתונים + GitHub + Render — אוטומטי', included: true },
      { label: 'שליחת מיילים (Resend)', included: true },
      { label: 'אחסון תמונות (Cloudinary)', included: true },
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
      { label: 'מסד נתונים + GitHub + Render — אוטומטי', included: true },
      { label: 'שליחת מיילים (Resend)', included: true },
      { label: 'אחסון תמונות (Cloudinary)', included: true },
      { label: 'פגישות צוות AI (Meeting System)', included: true },
      { label: 'ביקורת יועצים חיצוניים', included: true },
      { label: 'ציון איכות האפיון', included: true },
      { label: 'מודל AI חזק יותר (Claude Sonnet)', included: true },
    ],
    requiresKey: false,
  },
];

function PlanCard({ plan, currentPlan, hasApiKey, onSelect, loading }) {
  const isActive = currentPlan === plan.key;
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
            ? 'הזן מפתח API קודם ↓'
            : loading ? 'מחליף...' : `עבור ל-${plan.name}`}
        </button>
      )}
    </div>
  );
}

function ApiKeySection({ hasApiKey, apiKeyHint, onSaved, onDeleted }) {
  const [mode, setMode]   = useState('idle'); // idle | editing | deleting
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await updateApiKey(value.trim());
      onSaved(res.data);
      setMode('idle'); setValue('');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true); setError('');
    try {
      const res = await deleteApiKey();
      onDeleted(res.data);
      setMode('idle');
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה במחיקה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-apikey">
      <div className="settings-apikey__header">
        <div>
          <h3 className="settings-apikey__title">מפתח API אישי (לתוכנית Starter)</h3>
          <p className="settings-apikey__subtitle">
            מפתח שמאפשר ל-Power Plan לדבר עם Claude בשמך — בלי שנגע בכסף שלך.
          </p>
        </div>
        <div className={`settings-apikey__status${hasApiKey ? ' settings-apikey__status--ok' : ''}`}>
          {hasApiKey ? '✓ מוגדר' : 'לא מוגדר'}
        </div>
      </div>

      {hasApiKey && mode === 'idle' && (
        <div className="settings-apikey__current">
          <span className="settings-apikey__hint">{apiKeyHint}</span>
          <div className="settings-apikey__actions">
            <button className="btn btn--secondary" onClick={() => setMode('editing')}>עדכן</button>
            <button className="btn settings-apikey__delete-btn" onClick={() => setMode('deleting')}>מחק</button>
          </div>
        </div>
      )}

      {!hasApiKey && mode === 'idle' && (
        <button className="btn btn--primary" onClick={() => setMode('editing')}>+ הזן מפתח API</button>
      )}

      {mode === 'editing' && (
        <div className="settings-apikey__form">
          <div className="settings-apikey__howto">
            <p className="settings-apikey__howto-title">איך מקבלים מפתח?</p>
            <ol className="settings-apikey__howto-steps">
              <li>היכנס לאתר <strong>console.anthropic.com</strong></li>
              <li>לחץ על "API Keys" בתפריט הצד</li>
              <li>לחץ "Create Key" ותן לו שם (למשל: "Power Plan")</li>
              <li>העתק את המפתח (מתחיל ב-<code>sk-ant-</code>) והדבק כאן</li>
            </ol>
            <p className="settings-apikey__howto-cost">
              💡 <strong>כמה זה עולה?</strong> כל פרויקט שלם עם Claude Haiku עולה בערך <strong>₪1-5</strong>. יש חיוב רק על שימוש בפועל — אין תשלום חודשי לאנתרופיק.
            </p>
          </div>
          <input
            type="password"
            className="settings-apikey__input"
            placeholder="sk-ant-api03-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            dir="ltr"
          />
          {error && <p className="settings-apikey__error">{error}</p>}
          <div className="settings-apikey__form-actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !value.trim()}>
              {saving ? 'שומר...' : 'שמור מפתח'}
            </button>
            <button className="btn btn--secondary" onClick={() => { setMode('idle'); setValue(''); setError(''); }}>
              ביטול
            </button>
          </div>
        </div>
      )}

      {mode === 'deleting' && (
        <div className="settings-apikey__confirm-delete">
          <p>למחוק את המפתח? אם התוכנית שלך היא Starter, תועבר אוטומטית ל-Pro.</p>
          {error && <p className="settings-apikey__error">{error}</p>}
          <div className="settings-apikey__form-actions">
            <button className="btn settings-apikey__delete-btn" onClick={handleDelete} disabled={saving}>
              {saving ? 'מוחק...' : 'כן, מחק'}
            </button>
            <button className="btn btn--secondary" onClick={() => setMode('idle')}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError,   setPlanError]   = useState('');
  const [loadError,   setLoadError]   = useState('');

  useEffect(() => {
    getSettings()
      .then((res) => setSettings(res.data))
      .catch(() => setLoadError('לא ניתן לטעון הגדרות. נסה לרענן.'));
  }, []);

  async function handleSelectPlan(plan) {
    setPlanLoading(true); setPlanError('');
    try {
      const res = await updatePlan(plan);
      setSettings((s) => ({ ...s, plan: res.data.plan }));
    } catch (err) {
      setPlanError(err.response?.data?.error || 'שגיאה בשינוי תוכנית');
    } finally {
      setPlanLoading(false);
    }
  }

  function handleApiKeySaved(data) {
    setSettings((s) => ({ ...s, hasApiKey: data.hasApiKey, apiKeyHint: data.apiKeyHint }));
  }

  function handleApiKeyDeleted(data) {
    setSettings((s) => ({ ...s, hasApiKey: false, apiKeyHint: null, plan: data.plan }));
  }

  return (
    <div className="settings-page">
      <div className="settings-page__topbar">
        <button className="btn-ghost" onClick={() => navigate('/dashboard')}>← חזור</button>
        <h1 className="settings-page__title">הגדרות חשבון</h1>
      </div>

      {loadError && <div className="settings-page__load-error">{loadError}</div>}

      {!settings && !loadError && (
        <div className="settings-page__loading"><div className="spinner" /></div>
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
            <ApiKeySection
              hasApiKey={settings.hasApiKey}
              apiKeyHint={settings.apiKeyHint}
              onSaved={handleApiKeySaved}
              onDeleted={handleApiKeyDeleted}
            />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">שירותים שכלולים אוטומטית</h2>
            <p className="settings-section__desc">
              בכל פרויקט שנבנה, Power Plan מחברת את כל השירותים הבאים אוטומטית — אין צורך בהרשמה או קונפיגורציה.
            </p>
            <div className="settings-infra-grid">
              {INFRA_SERVICES.map((svc) => (
                <div key={svc.name} className="settings-infra-card">
                  <span className="settings-infra-card__icon">{svc.icon}</span>
                  <div>
                    <p className="settings-infra-card__name">{svc.name}</p>
                    <p className="settings-infra-card__desc">{svc.desc}</p>
                  </div>
                  <span className="settings-infra-card__badge">אוטומטי ✓</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const INFRA_SERVICES = [
  { icon: '🗄️', name: 'MongoDB Atlas',  desc: 'מסד נתונים — נוצר ומוגדר לכל פרויקט בנפרד' },
  { icon: '📦', name: 'GitHub',         desc: 'הקוד שמור ב-repo פרטי תחת Power Plan' },
  { icon: '🚀', name: 'Render',         desc: 'השרת פורסם ורץ ב-render.com' },
  { icon: '📧', name: 'Resend',         desc: 'שליחת מיילים מהאפליקציה — מוכן לשימוש' },
  { icon: '🖼️', name: 'Cloudinary',    desc: 'העלאת תמונות וקבצים — מוכן לשימוש' },
];
