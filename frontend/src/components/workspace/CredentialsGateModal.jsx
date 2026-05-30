import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { saveServiceCredentials, skipServiceCredentials, consultService } from '../../api/projects.api';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const DONE_DELAY_MS = 800;
const ERR_STYLE     = { margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' };

function ServiceCard({ projectId, service, onSaved, onSkipped }) {
  const { t } = useTranslation();
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
      setErr(e.message || t('workspace.creds.errorSave'));
    } finally { setBusy(false); }
  }

  async function handleSkip() {
    setBusy(true); setErr('');
    try {
      await skipServiceCredentials(projectId, service.id);
      setSkipped(true);
      onSkipped();
    } catch (e) {
      setErr(e.message || t('workspace.creds.errorSkip'));
    } finally { setBusy(false); }
  }

  async function handleConsult() {
    setConsulting(true);
    try {
      const res = await consultService(projectId, service.id);
      setAdvice(res.explanation);
    } catch {
      setAdvice(t('workspace.creds.errorConsult'));
    } finally { setConsulting(false); }
  }

  if (saved) {
    return (
      <div className="creds-card creds-card--done">
        <div className="creds-card__header">
          <span className="creds-card__name">{service.name}</span>
          <span className="creds-card__check">{t('workspace.creds.saved')}</span>
        </div>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="creds-card creds-card--skipped">
        <div className="creds-card__header">
          <span className="creds-card__name">{service.name}</span>
          <span className="creds-card__skipped-label">{t('workspace.creds.skipped')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="creds-card" data-id={service.id}>
      <div className="creds-card__header">
        <span className="creds-card__name">{service.name}</span>
        {service.optional
          ? <span className="creds-card__badge creds-card__badge--optional">{t('workspace.creds.optional')}</span>
          : <span className="creds-card__badge creds-card__badge--required">{t('workspace.creds.required')}</span>
        }
      </div>

      {service.howto && (
        <div className="creds-card__howto">
          <span className="creds-card__howto-label">{t('workspace.creds.howto')} </span>
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
              spellCheck={false}
              dir="ltr"
              style={{ fontSize: 13 }}
            />
          </div>
        ))}
      </div>

      {err && <p style={ERR_STYLE}>{err}</p>}

      <button
        className="btn btn--ghost creds-card__consult"
        onClick={handleConsult}
        disabled={consulting || busy}
      >
        {consulting ? t('workspace.creds.consulting') : t('workspace.creds.consult')}
      </button>

      {advice && (
        <div className="creds-card__advice">
          <p style={{ margin: 0 }}>{advice}</p>
          <button className="creds-card__skip-anyway" onClick={handleSkip} disabled={busy}>
            {t('workspace.creds.skipAnyway')}
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
            {t('workspace.creds.skip')}
          </button>
        )}
        <button
          className="btn btn--primary"
          style={{ fontSize: 13 }}
          onClick={handleSave}
          disabled={busy || !allFilled}
        >
          {busy ? t('workspace.creds.saving') : t('workspace.creds.save')}
        </button>
      </div>
    </div>
  );
}

export default function CredentialsGateModal({ projectId, services, onDone, onClose }) {
  const { t } = useTranslation();
  const [savedCount, setSavedCount]   = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const modalRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const first = modalRef.current?.querySelector(FOCUSABLE);
    first?.focus();
    return () => prev?.focus();
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape' && onClose) { onClose(); return; }
    if (e.key !== 'Tab') return;
    const els = Array.from(modalRef.current?.querySelectorAll(FOCUSABLE) || []);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

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
    const requiredSaved = saved >= requiredServices.length;
    const allOptionalHandled = saved + skipped >= services.length;
    if (requiredSaved && (optionalServices.length === 0 || allOptionalHandled)) {
      setTimeout(onDone, DONE_DELAY_MS);
    }
  }

  const totalHandled = savedCount + skippedCount;

  return (
    <div className="creds-overlay">
      <div
        className="creds-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="creds-modal-title"
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <div className="creds-modal__header">
          <div>
            <div className="creds-modal__title" id="creds-modal-title">{t('workspace.creds.title')}</div>
            <div className="creds-modal__subtitle">{t('workspace.creds.subtitle')}</div>
          </div>
          {onClose && (
            <button className="creds-modal__close" onClick={onClose} aria-label={t('workspace.creds.close')}>✕</button>
          )}
        </div>

        <div className="creds-modal__body">
          {totalHandled < services.length ? (
            <>
              <p className="creds-modal__progress">
                {t('workspace.creds.servicesHandled', { handled: totalHandled, total: services.length })}
              </p>
              {requiredServices.length > 0 && (
                <p className="creds-modal__section-label">{t('workspace.creds.required')}</p>
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
                <p className="creds-modal__section-label">{t('workspace.creds.optionalNote')}</p>
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
              <span>{t('workspace.creds.allHandled')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
