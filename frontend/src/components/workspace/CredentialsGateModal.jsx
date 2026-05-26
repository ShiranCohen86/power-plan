import { useState } from 'react';
import { saveServiceCredentials } from '../../api/projects.api';

function ServiceCard({ projectId, service, onSaved }) {
  const [values, setValues]   = useState(() => Object.fromEntries(service.fields.map((f) => [f.key, ''])));
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [saved, setSaved]     = useState(false);

  const allFilled = service.fields.every((f) => values[f.key]?.trim());

  async function handleSave() {
    setBusy(true); setErr('');
    try {
      await saveServiceCredentials(projectId, service.id, values);
      setSaved(true);
      onSaved();
    } catch (e) {
      setErr(e.message || 'שגיאה בשמירה');
    } finally { setBusy(false); }
  }

  if (saved) {
    return (
      <div className="creds-card creds-card--done">
        <div className="creds-card__header">
          <span className="creds-card__name">{service.name}</span>
          <span className="creds-card__check">✓ נשמר</span>
        </div>
      </div>
    );
  }

  return (
    <div className="creds-card" data-id={service.id}>
      <div className="creds-card__header">
        <span className="creds-card__name">{service.name}</span>
      </div>

      {service.howto && (
        <div className="creds-card__howto">
          <span className="creds-card__howto-label">איך מקבלים: </span>
          {service.howto}
        </div>
      )}

      <div className="creds-card__fields">
        {service.fields.map((field) => (
          <div key={field.key} className="creds-card__field">
            <label className="creds-card__label">{field.label}</label>
            <input
              type="password"
              className="form-input"
              placeholder={field.placeholder || field.key}
              value={values[field.key]}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              autoComplete="off"
              dir="ltr"
              style={{ fontSize: 13 }}
            />
          </div>
        ))}
      </div>

      {err && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{err}</p>}

      <button
        className="btn btn--primary"
        style={{ fontSize: 13, marginTop: 8 }}
        onClick={handleSave}
        disabled={busy || !allFilled}
      >
        {busy ? 'שומר...' : 'שמור'}
      </button>
    </div>
  );
}

export default function CredentialsGateModal({ projectId, services, onDone }) {
  const [savedCount, setSavedCount] = useState(0);

  function handleOneSaved() {
    setSavedCount((n) => {
      const next = n + 1;
      if (next >= services.length) {
        setTimeout(onDone, 800); // brief delay so user sees all "✓ נשמר"
      }
      return next;
    });
  }

  return (
    <div className="creds-overlay">
      <div className="creds-modal">
        <div className="creds-modal__header">
          <div>
            <div className="creds-modal__title">🔧 שירותים נדרשים לפרויקט</div>
            <div className="creds-modal__subtitle">
              ה-AI זיהה שהאפליקציה שלך משתמשת בשירותים הבאים.
              הזן את קודי הגישה כדי שהקוד יכלול אותם מוכן לפריסה.
            </div>
          </div>
        </div>

        <div className="creds-modal__body">
          {savedCount < services.length ? (
            <>
              <p className="creds-modal__progress">
                {savedCount} / {services.length} שירותים הוגדרו
              </p>
              {services.map((svc) => (
                <ServiceCard key={svc.id} projectId={projectId} service={svc} onSaved={handleOneSaved} />
              ))}
            </>
          ) : (
            <div className="creds-modal__all-done">
              <span>✅</span>
              <span>כל השירותים הוגדרו — הבנייה ממשיכה!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
