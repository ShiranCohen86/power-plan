import { useState } from 'react';
import { Link } from 'react-router-dom';
import { updateApiKey, updateGithubToken, updateRenderToken } from '../api/settings.api';

const GATE_CONFIG = {
  anthropic: {
    icon: '🤖',
    title: 'נדרש מפתח AI (Anthropic)',
    reason: 'כדי שClaudeיוכל לנתח את הרעיון שלך ולשאול שאלות, צריך מפתח API אישי מאנתרופיק.',
    cost: '💡 כל פרויקט שלם עולה בערך ₪1-5 — חיוב לפי שימוש בלבד.',
    placeholder: 'sk-ant-api03-...',
    howto: {
      title: 'איך מקבלים מפתח?',
      steps: [
        { html: 'היכנס לאתר <strong>console.anthropic.com</strong>' },
        { html: 'לחץ "API Keys" → "Create Key"' },
        { html: 'העתק את המפתח (מתחיל ב-<code>sk-ant-</code>)' },
      ],
    },
    saveFn: (v) => updateApiKey(v),
    resultKey: 'hasApiKey',
  },
  github: {
    icon: '🐙',
    title: 'נדרש קוד גישה ל-GitHub',
    reason: 'לפני שנתחיל לכתוב קוד, צריך מקום לשמור אותו. הקוד של האפליקציה שלך יישמר ב-GitHub שלך.',
    cost: '💡 GitHub חינמי לחלוטין.',
    placeholder: 'ghp_...',
    howto: {
      title: 'איך מקבלים קוד גישה?',
      steps: [
        { html: 'היכנס ל-<strong>github.com</strong> (צור חשבון חינמי אם אין לך)' },
        { html: 'תמונה שלך → Settings → Developer settings → Personal access tokens → Tokens (classic)' },
        { html: 'לחץ "Generate new token" → בחר scope: <code>repo</code> בלבד → העתק' },
      ],
    },
    saveFn: (v) => updateGithubToken(v),
    resultKey: 'hasGithubToken',
  },
  render: {
    icon: '🚀',
    title: 'נדרש קוד גישה ל-Render',
    reason: 'כדי לפרוס את האפליקציה שלך לאינטרנט, צריך גישה לחשבון Render שלך.',
    cost: '💡 Render מציע tier חינמי — האפליקציה שלך תרוץ בחינם.',
    placeholder: 'rnd_...',
    howto: {
      title: 'איך מקבלים קוד גישה?',
      steps: [
        { html: 'היכנס ל-<strong>render.com</strong> (צור חשבון חינמי אם אין לך)' },
        { html: 'Account Settings → API Keys → Create API Key' },
        { html: 'העתק את ה-API key (מתחיל ב-<code>rnd_</code>)' },
      ],
    },
    saveFn: (v) => updateRenderToken(v),
    resultKey: 'hasRenderToken',
  },
};

export default function SettingsGate({ service, onConfigured }) {
  const cfg = GATE_CONFIG[service];
  const [value, setValue]   = useState('');
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true); setError('');
    try {
      await cfg.saveFn(value.trim());
      onConfigured();
    } catch (e) {
      setError(e.message || 'שגיאה בשמירה — נסה שוב');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-gate">
      <div className="settings-gate__icon">{cfg.icon}</div>
      <h3 className="settings-gate__title">{cfg.title}</h3>
      <p className="settings-gate__reason">{cfg.reason}</p>

      {!open && (
        <div className="settings-gate__entry">
          <button className="btn btn--primary" onClick={() => setOpen(true)}>
            + הזן קוד גישה
          </button>
          <Link to="/settings" className="settings-gate__settings-link">
            ניהול כל ההגדרות →
          </Link>
        </div>
      )}

      {open && (
        <div className="settings-gate__form">
          <div className="settings-gate__howto">
            <p className="settings-gate__howto-title">{cfg.howto.title}</p>
            <ol className="settings-gate__howto-steps">
              {cfg.howto.steps.map((step, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: step.html }} />
              ))}
            </ol>
            <p className="settings-gate__cost">{cfg.cost}</p>
          </div>

          <input
            type="password"
            className="form-input settings-gate__input"
            placeholder={cfg.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            dir="ltr"
          />

          {error && <p className="settings-gate__error">{error}</p>}

          <div className="settings-gate__actions">
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving || !value.trim()}
            >
              {saving ? 'שומר...' : 'שמור והמשך'}
            </button>
            <button className="btn btn--secondary" onClick={() => { setOpen(false); setValue(''); setError(''); }}>
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
