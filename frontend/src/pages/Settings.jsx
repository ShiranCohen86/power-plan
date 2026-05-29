import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getSettings, updateApiKey, deleteApiKey, validateApiKey,
} from '../api/settings.api';
import { webAuthnRegisterStart, webAuthnRegisterFinish } from '../api/auth.api.js';

function TokenSection({ title, subtitle, hint, hasToken, onSave, onDelete, inputProps, onValidate }) {
  const { t } = useTranslation();
  const [mode, setMode]         = useState('idle');
  const [value, setValue]       = useState('');
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [validating, setValidating] = useState(false);
  const [validResult, setValidResult] = useState(null);

  async function handleSave() {
    if (!value.trim()) return;
    setBusy(true); setErr('');
    try {
      await onSave(value.trim());
      setMode('idle'); setValue(''); setValidResult(null);
    } catch (e) {
      setErr(e.message || t('settings.errorSave'));
    } finally { setBusy(false); }
  }

  async function handleValidate() {
    if (!value.trim() || !onValidate) return;
    setValidating(true); setValidResult(null);
    try {
      const res = await onValidate(value.trim());
      setValidResult(res);
    } catch {
      setValidResult({ valid: false, error: t('settings.errorNetwork') });
    } finally { setValidating(false); }
  }

  async function handleDelete() {
    setBusy(true); setErr('');
    try {
      await onDelete();
      setMode('idle');
    } catch (e) {
      setErr(e.message || t('settings.errorDelete'));
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
          {hasToken ? t('settings.statusSet') : t('settings.statusUnset')}
        </div>
      </div>

      {hasToken && mode === 'idle' && (
        <div className="settings-apikey__current">
          <span className="settings-apikey__hint">{hint}</span>
          <div className="settings-apikey__actions">
            <button className="btn btn--secondary" onClick={() => setMode('editing')}>{t('settings.update')}</button>
            <button className="btn settings-apikey__delete-btn" onClick={() => setMode('deleting')}>{t('common.delete')}</button>
          </div>
        </div>
      )}

      {!hasToken && mode === 'idle' && (
        <button className="btn btn--primary" onClick={() => setMode('editing')}>{t('settings.enterKey')}</button>
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
            spellCheck={false}
            dir="ltr"
          />
          {err && <p className="settings-apikey__error">{err}</p>}
          {validResult && (
            <p style={{ fontSize: 13, marginTop: 6, color: validResult.valid ? 'var(--success, #16a34a)' : 'var(--danger)' }}>
              {validResult.valid ? t('settings.keyValid') : `✗ ${validResult.error}`}
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
                {validating ? t('settings.checking') : t('settings.checkKey')}
              </button>
            )}
            <button className="btn btn--primary" onClick={handleSave} disabled={busy || !value.trim()}>
              {busy ? t('settings.saving') : t('common.save')}
            </button>
            <button className="btn btn--secondary" onClick={() => { setMode('idle'); setValue(''); setErr(''); setValidResult(null); }}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {mode === 'deleting' && (
        <div className="settings-apikey__confirm-delete">
          <p>{t('settings.confirmDeleteMsg')}</p>
          {err && <p className="settings-apikey__error">{err}</p>}
          <div className="settings-apikey__form-actions">
            <button className="btn settings-apikey__delete-btn" onClick={handleDelete} disabled={busy}>
              {busy ? t('settings.deleting') : t('workspace.projSettings.confirmDelete')}
            </button>
            <button className="btn btn--secondary" onClick={() => setMode('idle')}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BiometricSection() {
  const { t } = useTranslation();
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [registered, setRegistered] = useState(localStorage.getItem('pp-biometric') === '1');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!window.PublicKeyCredential) return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((ok) => setPlatformAvailable(ok))
      .catch(() => {});
  }, []);

  if (!platformAvailable) return null;

  async function handleRegister() {
    setStatus('loading'); setError('');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const options  = await webAuthnRegisterStart();
      const response = await startRegistration({ optionsJSON: options });
      await webAuthnRegisterFinish(response);
      localStorage.setItem('pp-biometric', '1');
      setRegistered(true);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e.message || t('settings.biometricError'));
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.biometricSection')}</h2>
      <p className="settings-section__desc">{t('settings.biometricDesc')}</p>
      <div className="settings-apikey">
        <div className="settings-apikey__header">
          <div>
            <h3 className="settings-apikey__title">{t('settings.biometricTitle')}</h3>
            <p className="settings-apikey__subtitle">{t('settings.biometricSubtitle')}</p>
          </div>
          <div className={`settings-apikey__status${registered ? ' settings-apikey__status--ok' : ''}`}>
            {registered ? t('settings.biometricEnabled') : t('settings.biometricDisabled')}
          </div>
        </div>
        {registered ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {t('settings.biometricReady')}
          </p>
        ) : (
          <button
            className="btn btn--primary"
            onClick={handleRegister}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? t('common.loading') : t('settings.biometricRegister')}
          </button>
        )}
        {error && <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
      </div>
    </section>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const [settings,  setSettings]  = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getSettings()
      .then((res) => setSettings(res))
      .catch(() => setLoadError(t('settings.loadError')));
  }, []);

  return (
    <div className="settings-page">
      <div className="settings-page__heading">
        <h1 className="settings-page__title">{t('settings.title')}</h1>
      </div>

      {loadError && <div className="settings-page__load-error">{loadError}</div>}

      {!settings && !loadError && (
        <div className="settings-page__loading"><div className="pwa-spinner" /></div>
      )}

      {settings && !settings.hasApiKey && (
        <div className="settings-onboarding-hint">
          <span>{t('settings.onboarding')}</span>
        </div>
      )}

      {settings?.hasApiKey && (
        <div className="settings-ready-cta">
          <span className="settings-ready-cta__icon">✅</span>
          <div>
            <strong>{t('settings.allSet')}</strong>
            <span> {t('settings.allSetDesc')}</span>
          </div>
          <a href="/new-project" className="btn btn--primary">{t('settings.startBuilding')}</a>
        </div>
      )}

      {settings && (
        <div className="settings-page__body">
          <BiometricSection />
          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.apiSection')}</h2>
            <p className="settings-section__desc">{t('settings.apiDesc')}</p>

            <TokenSection
              title={t('settings.tokenTitle')}
              subtitle={t('settings.tokenSubtitle')}
              hint={settings.apiKeyHint}
              hasToken={settings.hasApiKey}
              onValidate={(key) => validateApiKey(key)}
              onSave={async (v) => {
                const res = await updateApiKey(v);
                setSettings((s) => ({ ...s, hasApiKey: res.hasApiKey, apiKeyHint: res.apiKeyHint }));
              }}
              onDelete={async () => {
                await deleteApiKey();
                setSettings((s) => ({ ...s, hasApiKey: false, apiKeyHint: null }));
              }}
              inputProps={{
                placeholder: 'sk-ant-api03-...',
                howto: {
                  title: t('settings.howtoTitle'),
                  steps: [
                    t('settings.howtoStep1'),
                    t('settings.howtoStep2'),
                    t('settings.howtoStep3'),
                    t('settings.howtoStep4'),
                  ],
                  note: t('settings.howtoNote'),
                },
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
