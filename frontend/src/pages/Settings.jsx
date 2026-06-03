import { useState, useEffect } from 'react';
import Skeleton from '@mui/material/Skeleton';
import { useAppTheme } from '../context/ThemeContext.jsx';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { BIOMETRIC_STORAGE_KEY } from '../config/constants.js';
import {
  getSettings, updateApiKey, deleteApiKey, validateApiKey,
  updateGithubToken, deleteGithubToken, updateRenderToken, deleteRenderToken,
  getNotifPrefs, updateNotifPrefs, updateWebhookUrl, deleteWebhookUrl,
} from '../api/settings.api';
import { webAuthnRegisterStart, webAuthnRegisterFinish, getSessions, revokeSession, totpSetup, totpEnable, totpDisable, changePassword } from '../api/auth.api.js';

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
                  <li key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(s, { ALLOWED_TAGS: ['strong', 'code', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] }) }} />
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

function NotifPrefsSection() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    getNotifPrefs().then(setPrefs).catch(() => {});
  }, []);

  async function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try { await updateNotifPrefs({ [key]: next[key] }); } catch { setPrefs(prefs); }
  }

  if (!prefs) return null;

  const items = [
    { key: 'deploymentSuccess', label: t('settings.notif.deploymentSuccess') },
    { key: 'planningComplete',  label: t('settings.notif.planningComplete') },
    { key: 'quotaExhausted',    label: t('settings.notif.quotaExhausted') },
    { key: 'phaseFailed',       label: t('settings.notif.phaseFailed') },
  ];

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.notifSection')}</h2>
      <p className="settings-section__desc">{t('settings.notifDesc')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={!!prefs[key]}
              onChange={() => toggle(key)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}

function TotpSection({ totpEnabled: initialEnabled }) {
  const { t } = useTranslation();
  const [enabled, setEnabled]   = useState(initialEnabled);
  const [step, setStep]         = useState('idle'); // idle | setup | disable
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');

  async function handleSetup() {
    setBusy(true); setErr('');
    try {
      const res = await totpSetup();
      setQrDataUrl(res.qrDataUrl);
      setStep('setup');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function handleEnable() {
    setBusy(true); setErr('');
    try {
      await totpEnable(codeInput.trim());
      setEnabled(true); setStep('idle'); setCodeInput(''); setQrDataUrl('');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function handleDisable() {
    setBusy(true); setErr('');
    try {
      await totpDisable(codeInput.trim());
      setEnabled(false); setStep('idle'); setCodeInput('');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.totpSection')}</h2>
      <p className="settings-section__desc">{t('settings.totpDesc')}</p>
      <div className="settings-apikey">
        <div className="settings-apikey__header">
          <div>
            <h3 className="settings-apikey__title">2FA</h3>
          </div>
          <div className={`settings-apikey__status${enabled ? ' settings-apikey__status--ok' : ''}`}>
            {enabled ? t('settings.totpEnabled') : t('settings.totpDisabled')}
          </div>
        </div>
        {err && <p className="settings-apikey__error">{err}</p>}
        {step === 'idle' && !enabled && (
          <button className="btn btn--primary" onClick={handleSetup} disabled={busy}>
            {t('settings.totpSetup')}
          </button>
        )}
        {step === 'idle' && enabled && (
          <button className="btn btn--secondary" onClick={() => setStep('disable')}>
            {t('settings.totpDisableBtn')}
          </button>
        )}
        {step === 'setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13 }}>{t('settings.totpScanQR')}</p>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 180, borderRadius: 8, alignSelf: 'center' }} />}
            <input
              type="text" inputMode="numeric" maxLength={6} dir="ltr"
              className="settings-apikey__input"
              placeholder={t('settings.totpCodePlaceholder')}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ letterSpacing: '0.2em', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--primary" onClick={handleEnable} disabled={busy || codeInput.length < 6}>
                {busy ? '...' : t('settings.totpVerifyBtn')}
              </button>
              <button className="btn btn--secondary" onClick={() => { setStep('idle'); setCodeInput(''); setQrDataUrl(''); }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
        {step === 'disable' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13 }}>{t('settings.totpDisableConfirm')}</p>
            <input
              type="text" inputMode="numeric" maxLength={6} dir="ltr"
              className="settings-apikey__input"
              placeholder={t('settings.totpCodePlaceholder')}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ letterSpacing: '0.2em', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn settings-apikey__delete-btn" onClick={handleDisable} disabled={busy || codeInput.length < 6}>
                {busy ? '...' : t('settings.totpDisableBtn')}
              </button>
              <button className="btn btn--secondary" onClick={() => { setStep('idle'); setCodeInput(''); }}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SessionsSection() {
  const { t } = useTranslation();
  const [sessions, setSessions]   = useState(null);
  const [revoking, setRevoking]   = useState(null);

  useEffect(() => {
    getSessions().then((r) => setSessions(r.sessions)).catch(() => setSessions([]));
  }, []);

  async function handleRevoke(jtiHash) {
    setRevoking(jtiHash);
    try {
      await revokeSession(jtiHash);
      setSessions((prev) => prev.filter((s) => s.jtiHash !== jtiHash));
    } finally { setRevoking(null); }
  }

  if (!sessions) return null;

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.sessionsSection')}</h2>
      <p className="settings-section__desc">{t('settings.sessionsDesc')}</p>
      <div className="settings-sessions">
        {sessions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('settings.sessionsNone')}</p>
        ) : sessions.map((s) => (
          <div key={s.jtiHash} className="settings-session">
            <div className="settings-session__info">
              <span className="settings-session__agent">{s.userAgent || t('settings.sessionUnknown')}</span>
              <span className="settings-session__meta">{s.ip} · {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString() : ''}</span>
            </div>
            <button
              className="btn btn--secondary settings-session__revoke"
              onClick={() => handleRevoke(s.jtiHash)}
              disabled={revoking === s.jtiHash}
            >
              {revoking === s.jtiHash ? '...' : t('settings.sessionRevoke')}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function BiometricSection() {
  const { t } = useTranslation();
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [registered, setRegistered] = useState(localStorage.getItem(BIOMETRIC_STORAGE_KEY) === '1');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (navigator.maxTouchPoints === 0) return;
    if (!window.PublicKeyCredential) return;
    (async () => {
      try {
        const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setPlatformAvailable(ok);
      } catch { /* feature detection — failure is non-fatal */ }
    })();
  }, []);

  if (!platformAvailable) return null;

  async function handleRegister() {
    setStatus('loading'); setError('');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const options  = await webAuthnRegisterStart();
      const response = await startRegistration({ optionsJSON: options });
      await webAuthnRegisterFinish(response);
      localStorage.setItem(BIOMETRIC_STORAGE_KEY, '1');
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

function ChangePasswordSection() {
  const { t } = useTranslation();
  const [cur,  setCur]  = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const [ok,   setOk]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (next.length < 8) { setErr(t('settings.pwdMinLen')); return; }
    setBusy(true); setErr(''); setOk(false);
    try {
      await changePassword(cur, next);
      setOk(true); setCur(''); setNext('');
      setTimeout(() => setOk(false), 3000);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.changePasswordSection')}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
        <input type="password" className="settings-apikey__input" placeholder={t('settings.currentPassword')}
          value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" dir="ltr" />
        <input type="password" className="settings-apikey__input" placeholder={t('settings.newPassword')}
          value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" dir="ltr" />
        {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
        {ok  && <p style={{ color: '#22c55e', fontSize: 13 }}>✅ {t('settings.passwordChanged')}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy || !cur || !next}>
          {busy ? t('settings.saving') : t('settings.changePasswordBtn')}
        </button>
      </form>
    </section>
  );
}

function WebhookSection() {
  const { t } = useTranslation();
  const [url,  setUrl]  = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  async function handleSave() {
    if (!url.startsWith('https://')) { setErr(t('settings.webhookHttps')); return; }
    setBusy(true); setErr('');
    try {
      await updateWebhookUrl(url);
      setSaved(true); setUrl(''); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.webhookSection')}</h2>
      <p className="settings-section__desc">{t('settings.webhookDesc')}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="url" value={url} onChange={(e) => { setUrl(e.target.value); setSaved(false); setErr(''); }}
          placeholder="https://your-server.com/webhook"
          className="settings-apikey__input" style={{ flex: 1, minWidth: 220 }} dir="ltr"
        />
        <button className="btn btn--primary" onClick={handleSave} disabled={busy || !url}>
          {busy ? '...' : t('common.save')}
        </button>
        <button className="btn btn--secondary" onClick={async () => { await deleteWebhookUrl(); setUrl(''); }}>
          {t('common.delete')}
        </button>
      </div>
      {err  && <p style={{ color: 'var(--danger)',   fontSize: 13, marginTop: 6 }}>{err}</p>}
      {saved && <p style={{ color: 'var(--success, #22c55e)', fontSize: 13, marginTop: 6 }}>✅ Webhook URL saved</p>}
    </section>
  );
}

function AppearanceSection() {
  const { t }               = useTranslation();
  const { mode, toggleTheme } = useAppTheme();
  return (
    <section className="settings-section">
      <h2 className="settings-section__title">{t('settings.appearanceSection')}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14 }}>{mode === 'dark' ? '🌙 מצב כהה' : '☀️ מצב בהיר'}</span>
        <button className="btn btn--secondary" onClick={toggleTheme} style={{ fontSize: 13 }}>
          {mode === 'dark' ? t('settings.switchLight') : t('settings.switchDark')}
        </button>
      </div>
    </section>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const [settings,  setSettings]  = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getSettings();
        setSettings(res);
      } catch {
        setLoadError(t('settings.loadError'));
      }
    })();
  }, []);

  return (
    <div className="settings-page">
      <div className="settings-page__heading">
        <h1 className="settings-page__title">{t('settings.title')}</h1>
      </div>

      {loadError && <div className="settings-page__load-error">{loadError}</div>}

      {!settings && !loadError && (
        <div className="settings-page__body" style={{ paddingTop: 16 }}>
          {[1,2,3].map((i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <Skeleton variant="text" width="40%" height={22} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            </div>
          ))}
        </div>
      )}

      {settings && !settings.hasApiKey && (
        <div className="settings-onboarding-hint">
          <span>{t('settings.onboarding')}</span>
        </div>
      )}

      {settings && !settings.hasGithubToken && settings.hasApiKey && (
        <div className="settings-onboarding-hint" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)' }}>
          <span>⚠️ {t('settings.deployHint')}</span>
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
          <AppearanceSection />
          <BiometricSection />
          <TotpSection totpEnabled={!!settings?.totpEnabled} />
          <ChangePasswordSection />
          <NotifPrefsSection />
          <WebhookSection />
          <SessionsSection />
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

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.deploySection')}</h2>
            <p className="settings-section__desc">{t('settings.deployDesc')}</p>

            <TokenSection
              title={t('settings.githubTokenTitle')}
              subtitle={t('settings.githubTokenSubtitle')}
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
              inputProps={{ placeholder: 'ghp_... or github_pat_...' }}
            />

            <TokenSection
              title={t('settings.renderTokenTitle')}
              subtitle={t('settings.renderTokenSubtitle')}
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
              inputProps={{ placeholder: 'rnd_...' }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
