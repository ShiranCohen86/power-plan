import { useState } from 'react';
import { saveServiceCredentials, skipServiceCredentials, consultService } from '../../api/projects.api';

function ServiceCard({ projectId, service, onSaved, onSkipped }) {
  const [values, setValues]     = useState(() => Object.fromEntries(service.fields.map((f) => [f.key, ''])));
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');
  const [saved, setSaved]       = useState(false);
  const [skipped, setSkipped]   = useState(false);
  const [consulting, setConsulting] = useState(false);
  const [advice, setAdvice]     = useState(null);

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

  async function handleSkip() {
    setBusy(true); setErr('');
    try {
      await skipServiceCredentials(projectId, service.id);
      setSkipped(true);
      onSkipped();
    } catch (e) {
      setErr(e.message || 'שגיאה בדילוג');
    } finally { setBusy(false); }
  }

  async function handleConsult() {
    setConsulting(true);
    try {
      const res = await consultService(projectId, service.id);
      setAdvice(res.explanation);
    } catch {
      setAdvice('לא ניתן לייצר הסבר כרגע — נסה שוב.');
    } finally { setConsulting(false); }
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

  if (skipped) {
    return (
      <div className="creds-card creds-card--skipped">
        <div className="creds-card__header">
          <span className="creds-card__name">{service.name}</span>
          <span className="creds-card__skipped-label">⏭ דולג</span>
        </div>
      </div>
    );
  }

  return (
    <div className="creds-card" data-id={service.id}>
      <div className="creds-card__header">
        <span className="creds-card__name">{service.name}</span>
        {service.optional
          ? <span className="creds-card__badge creds-card__badge--optional">אופציונלי</span>
          : <span className="creds-card__badge creds-card__badge--required">חובה</span>
        }
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
        className="btn btn--ghost creds-card__consult"
        onClick={handleConsult}
        disabled={consulting || busy}
      >
        {consulting ? 'שואל את Claude...' : '❓ האם אני צריך את זה?'}
      </button>

      {advice && (
        <div className="creds-card__advice">
          <p style={{ margin: 0 }}>{advice}</p>
          <button className="creds-card__skip-anyway" onClick={handleSkip} disabled={busy}>
            דלג בכל זאת ←
          </button>
        </div>
      )}

      <div className="creds-card__actions">
        {service.optional && !advice && (
          <button
            className="btn btn--ghost"
            style={{ fontSize: 13 }}
            onClick={handleSkip}
            disabled={busy}
          >
            דלג ←
          </button>
        )}
        <button
          className="btn btn--primary"
          style={{ fontSize: 13 }}
          onClick={handleSave}
          disabled={busy || !allFilled}
        >
          {busy ? 'שומר...' : 'שמור'}
        </button>
      </div>
    </div>
  );
}

export default function CredentialsGateModal({ projectId, services, onDone, onClose }) {
  const [savedCount, setSavedCount]   = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const requiredServices  = services.filter((s) => !s.optional);
  const optionalServices  = services.filter((s) => s.optional);

  function handleOneSaved() {
    setSavedCount((n) => {
      const next = n + 1;
      checkDone(next, skippedCount);
      return next;
    });
  }

  function handleOneSkipped() {
    setSkippedCount((n) => {
      const next = n + 1;
      checkDone(savedCount, next);
      return next;
    });
  }

  function checkDone(saved, skipped) {
    // Done when all required are saved + all optional are saved or skipped
    const requiredSaved = saved >= requiredServices.length;
    const allOptionalHandled = saved + skipped >= services.length;
    if (requiredSaved && (optionalServices.length === 0 || allOptionalHandled)) {
      setTimeout(onDone, 800);
    }
  }

  const totalHandled = savedCount + skippedCount;

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
          {onClose && (
            <button className="creds-modal__close" onClick={onClose} title="סגור">✕</button>
          )}
        </div>

        <div className="creds-modal__body">
          {totalHandled < services.length ? (
            <>
              <p className="creds-modal__progress">
                {totalHandled} / {services.length} שירותים טופלו
              </p>
              {requiredServices.length > 0 && (
                <p className="creds-modal__section-label">חובה</p>
              )}
              {requiredServices.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  projectId={projectId}
                  service={svc}
                  onSaved={handleOneSaved}
                  onSkipped={handleOneSkipped}
                />
              ))}
              {optionalServices.length > 0 && (
                <p className="creds-modal__section-label">אופציונלי — ניתן לדלג ולהגדיר מאוחר יותר</p>
              )}
              {optionalServices.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  projectId={projectId}
                  service={svc}
                  onSaved={handleOneSaved}
                  onSkipped={handleOneSkipped}
                />
              ))}
            </>
          ) : (
            <div className="creds-modal__all-done">
              <span>✅</span>
              <span>כל השירותים טופלו — הבנייה ממשיכה!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
