import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setProjectApiKey, setProjectGithubToken, setProjectRenderToken } from '../api/projects.api';

const SAVE_FNS = {
  anthropic: (projectId, v) => setProjectApiKey(projectId, v),
  github:    (projectId, v) => setProjectGithubToken(projectId, v),
  render:    (projectId, v) => setProjectRenderToken(projectId, v),
};

const ICONS = {
  anthropic: '🤖',
  github:    '🐙',
  render:    '🚀',
};

export default function SettingsGate({ service, projectId, onConfigured }) {
  const { t } = useTranslation();
  const [value, setValue]   = useState('');
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true); setError('');
    try {
      await SAVE_FNS[service](projectId, value.trim());
      onConfigured();
    } catch (e) {
      setError(e.message || t('settingsGate.errorSave'));
    } finally {
      setSaving(false);
    }
  }

  const title       = t(`settingsGate.${service}.title`);
  const reason      = t(`settingsGate.${service}.reason`);
  const cost        = t(`settingsGate.${service}.cost`);
  const placeholder = t(`settingsGate.${service}.placeholder`);
  const howtoTitle  = t(`settingsGate.${service}.howtoTitle`);
  const steps       = [
    t(`settingsGate.${service}.step1`),
    t(`settingsGate.${service}.step2`),
    t(`settingsGate.${service}.step3`),
  ];

  return (
    <div className="settings-gate">
      <div className="settings-gate__icon">{ICONS[service]}</div>
      <h3 className="settings-gate__title">{title}</h3>
      <p className="settings-gate__reason">{reason}</p>

      {!open && (
        <div className="settings-gate__entry">
          <button className="btn btn--primary" onClick={() => setOpen(true)}>
            {t('settingsGate.enterKey')}
          </button>
          <Link to="/settings" className="settings-gate__settings-link">
            {t('settingsGate.manageSettings')}
          </Link>
        </div>
      )}

      {open && (
        <div className="settings-gate__form">
          <div className="settings-gate__howto">
            <p className="settings-gate__howto-title">{howtoTitle}</p>
            <ol className="settings-gate__howto-steps">
              {steps.map((step, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: step }} />
              ))}
            </ol>
            <p className="settings-gate__cost">{cost}</p>
          </div>

          <input
            type="password"
            className="form-input settings-gate__input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={saving}
            autoFocus
            dir="ltr"
          />

          {error && <p className="settings-gate__error">{error}</p>}

          <div className="settings-gate__actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !value.trim()}>
              {saving ? t('settingsGate.saving') : t('settingsGate.saveContinue')}
            </button>
            <button className="btn btn--secondary" onClick={() => { setOpen(false); setValue(''); setError(''); }}>
              {t('settingsGate.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
