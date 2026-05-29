import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { webAuthnRegisterStart, webAuthnRegisterFinish } from '../../api/auth.api.js';

export default function BiometricEnrollPrompt({ onDone }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  async function handleEnable() {
    setStatus('loading'); setError('');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const options  = await webAuthnRegisterStart();
      const response = await startRegistration({ optionsJSON: options });
      await webAuthnRegisterFinish(response);
      localStorage.setItem('pp-biometric', '1');
      setStatus('success');
      setTimeout(onDone, 1400);
    } catch (e) {
      setStatus('error');
      setError(e.message || t('auth.biometricEnrollError'));
    }
  }

  return (
    <>
      <div className="login-brand">
        <span className="login-brand__icon">⚡</span>
        <span className="login-brand__name">{t('app.name')}</span>
      </div>

      <div className="login-card biometric-enroll-card">
        {status === 'success' ? (
          <div className="biometric-enroll__success">
            <span className="biometric-enroll__success-icon">✅</span>
            <p className="biometric-enroll__success-msg">{t('auth.biometricEnrollOk')}</p>
          </div>
        ) : (
          <>
            <div className="biometric-enroll__hero">
              <span className="biometric-enroll__icon">🔐</span>
              <h2 className="biometric-enroll__title">{t('auth.biometricEnrollTitle')}</h2>
              <p className="biometric-enroll__sub">{t('auth.biometricEnrollSub')}</p>
            </div>

            {error && (
              <div className="badge danger login-error">{error}</div>
            )}

            <button
              className="btn btn--primary login-submit"
              onClick={handleEnable}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? t('common.loading') : t('auth.biometricEnrollBtn')}
            </button>

            <p className="login-switch">
              <button type="button" className="btn-link" onClick={onDone}>
                {t('auth.biometricEnrollSkip')}
              </button>
            </p>
          </>
        )}
      </div>
    </>
  );
}
