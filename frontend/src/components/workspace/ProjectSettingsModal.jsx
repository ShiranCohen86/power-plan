import { useState, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
import { useTranslation } from 'react-i18next';
import {
  getProjectSettings,
  setProjectGithubToken, deleteProjectGithubToken,
  getRequiredServices, saveServiceCredentials, skipServiceCredentials,
} from '../../api/projects.api';

const ERR_STYLE = { margin: 0, fontSize: 12, color: 'var(--danger)' };

function TokenRow({ title, subtitle, hint, hasToken, onSave, onDelete, placeholder }) {
  const { t } = useTranslation();
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
      setErr(e.message || t('workspace.projSettings.errorSave'));
    } finally { setBusy(false); }
  }

  async function handleDelete() {
    setBusy(true); setErr('');
    try {
      await onDelete();
      setMode('idle');
    } catch (e) {
      setErr(e.message || t('workspace.projSettings.errorDelete'));
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
          {hasToken ? t('settings.statusSet') : t('settings.statusUnset')}
        </span>
      </div>

      {hasToken && hint && mode === 'idle' && (
        <div className="proj-settings-row__hint">{hint}</div>
      )}

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => setMode('editing')}>
            {hasToken ? t('workspace.projSettings.update') : t('workspace.projSettings.enter')}
          </button>
          {hasToken && (
            <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => setMode('deleting')}>
              {t('common.delete')}
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
            spellCheck={false}
            dir="ltr"
            style={{ fontSize: 13 }}
          />
          {err && <p style={ERR_STYLE}>{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" style={{ fontSize: 12 }} onClick={handleSave} disabled={busy || !value.trim()}>
              {busy ? t('workspace.projSettings.saving') : t('workspace.projSettings.save')}
            </button>
            <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => { setMode('idle'); setValue(''); setErr(''); }}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {mode === 'deleting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('workspace.projSettings.confirmDeleteMsg')}</p>
          {err && <p style={ERR_STYLE}>{err}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }} onClick={handleDelete} disabled={busy}>
              {busy ? t('workspace.projSettings.deleting') : t('workspace.projSettings.confirmDelete')}
            </button>
            <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => setMode('idle')}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceRow({ projectId, service, onUpdated }) {
  const [editing, setEditing] = useState(!service.credentialsProvided && !service.skipped);
  const [values, setValues]   = useState(() =>
    Object.fromEntries((service.fields || []).map((f) => [f.key, '']))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function handleSave() {
    setBusy(true); setErr('');
    try {
      await saveServiceCredentials(projectId, service.id, values);
      setEditing(false);
      onUpdated();
    } catch (e) {
      setErr(e.message || 'שגיאה בשמירה');
    } finally { setBusy(false); }
  }

  async function handleSkip() {
    setBusy(true); setErr('');
    try {
      await skipServiceCredentials(projectId, service.id);
      onUpdated();
    } catch (e) {
      setErr(e.message || 'שגיאה');
    } finally { setBusy(false); }
  }

  async function handleUnskip() {
    setBusy(true); setErr('');
    try {
      await saveServiceCredentials(projectId, service.id, {});
      onUpdated();
    } catch (e) {
      setErr(e.message || 'שגיאה');
    } finally { setBusy(false); }
  }

  return (
    <div className="creds-card">
      <div className="creds-card__header">
        <div className="creds-card__name">{service.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {service.credentialsProvided && !editing && (
            <>
              <span style={{ fontSize: 11, color: 'var(--success)' }}>✓ מוגדר</span>
              <button className="btn btn--secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setEditing(true)}>
                עדכן
              </button>
            </>
          )}
          {service.skipped && (
            <>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>דולג</span>
              <button className="btn btn--secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleUnskip} disabled={busy}>
                בטל דילוג
              </button>
            </>
          )}
          {!service.credentialsProvided && !service.skipped && service.optional && !editing && (
            <button className="btn btn--secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleSkip} disabled={busy}>
              דלג
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="creds-card__fields">
          {(service.fields || []).map((field) => (
            <div key={field.key} className="creds-field">
              <label className="creds-field__label">{field.label}</label>
              <input
                type="password"
                className="form-input creds-field__input"
                placeholder={field.placeholder || field.key}
                value={values[field.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
              />
            </div>
          ))}
          {service.howto && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{service.howto}</p>
          )}
          {err && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--danger)' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              className="btn btn--primary"
              style={{ fontSize: 12 }}
              onClick={handleSave}
              disabled={busy || (service.fields || []).some((f) => !values[f.key]?.trim())}
            >
              {busy ? 'שומר...' : 'שמור'}
            </button>
            {service.credentialsProvided && (
              <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={() => { setEditing(false); setErr(''); }}>
                ביטול
              </button>
            )}
            {service.optional && !service.skipped && !service.credentialsProvided && (
              <button className="btn btn--secondary" style={{ fontSize: 12 }} onClick={handleSkip} disabled={busy}>
                דלג
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectSettingsModal({ projectId, projectTitle, onClose }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const first = modalRef.current?.querySelector(FOCUSABLE);
    first?.focus();
    return () => prev?.focus();
  }, []);

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
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

  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, svcRes] = await Promise.all([
          getProjectSettings(projectId),
          getRequiredServices(projectId).catch(() => null),
        ]);
        setSettings(settingsRes);
        setServices(svcRes?.services || []);
      } catch {
        setLoadErr(t('workspace.projSettings.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function refreshServices() {
    try {
      const r = await getRequiredServices(projectId);
      setServices(r?.services || []);
    } catch { /* non-fatal — list stays stale until next open */ }
  }

  return (
    <div className="proj-settings-overlay" onClick={handleOverlayClick}>
      <div
        className="proj-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proj-settings-title"
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <div className="proj-settings-modal__header">
          <div>
            <div className="proj-settings-modal__title" id="proj-settings-title">{t('workspace.projSettings.title')}</div>
            {projectTitle && (
              <div className="proj-settings-modal__subtitle">{projectTitle}</div>
            )}
          </div>
          <button className="proj-settings-modal__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
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
              <p className="proj-settings-modal__desc">{t('workspace.projSettings.desc')}</p>

              <div className="proj-settings-modal__global-note">
                {t('workspace.projSettings.apiKeyNote')}
                {' '}<a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{t('settingsGate.manageSettings')}</a>
              </div>

              <TokenRow
                title={t('workspace.projSettings.githubTitle')}
                subtitle={t('workspace.projSettings.githubSubtitle')}
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

              <div className="proj-settings-divider" />

              <div className="proj-settings-services">
                <div className="proj-settings-services__title">שירותי האפליקציה</div>
                <div className="proj-settings-services__desc">
                  שירותים חיצוניים שהאפליקציה שנבנתה דורשת. מתעדכן אוטומטית לפי הקוד שנוצר.
                </div>
                {services.length === 0 ? (
                  <p className="proj-settings-services__empty">
                    אין שירותים חיצוניים נדרשים עדיין — יופיעו כאן לאחר שלב הקוד.
                  </p>
                ) : (
                  services.map((svc) => (
                    <ServiceRow
                      key={svc.id}
                      projectId={projectId}
                      service={svc}
                      onUpdated={refreshServices}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
