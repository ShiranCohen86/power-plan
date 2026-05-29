import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isMobileUA() {
  return /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function InstallSheetContent({ deferredPrompt, onClose }) {
  const { t } = useTranslation();

  async function handleNativeInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    onClose();
  }

  if (deferredPrompt) {
    return (
      <>
        <div className="bsheet__title">{t('pwa.installTitle')}</div>
        <div className="bsheet__body">{t('pwa.installBody')}</div>
        <div className="bsheet__actions">
          <button className="btn btn--primary" onClick={handleNativeInstall}>{t('pwa.installNow')}</button>
          <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.notNow')}</button>
        </div>
      </>
    );
  }

  if (isIOS()) {
    return (
      <>
        <div className="bsheet__title">{t('pwa.iosTitle')}</div>
        <div className="bsheet__body">
          <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwa.iosStep1')) }} />
          <p style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('pwa.iosStep2')) }} />
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' }}>{t('pwa.iosHint')}</p>
        </div>
        <div className="bsheet__actions">
          <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.iosGot')}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bsheet__title">{t('pwa.genericTitle')}</div>
      <div className="bsheet__body">
        <p>{t('pwa.genericBody')}</p>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-subtle)' }}>{t('pwa.genericHint')}</p>
      </div>
      <div className="bsheet__actions">
        <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.genericGot')}</button>
      </div>
    </>
  );
}

export function UpdateSheetContent({ onClose }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="bsheet__title">{t('pwa.updateTitle')}</div>
      <div className="bsheet__body">{t('pwa.updateBody')}</div>
      <div className="bsheet__actions">
        <button className="btn btn--primary" onClick={() => window.location.reload()}>{t('pwa.reload')}</button>
        <button className="btn btn--secondary bsheet__dismiss" onClick={onClose}>{t('pwa.later')}</button>
      </div>
    </>
  );
}

export function VersionSheetContent({ prevVersion, currentVersion, onClose }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="bsheet__title">{t('pwa.versionTitle')}</div>
      <div className="bsheet__body">
        {prevVersion
          ? <span>{t('pwa.versionBody', { prev: prevVersion, next: currentVersion })}</span>
          : <span>{t('pwa.versionBodyNew', { next: currentVersion })}</span>}
        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-subtle)' }}>
          {t('pwa.versionNote')}
        </p>
      </div>
      <div className="bsheet__actions">
        <button className="btn btn--primary" onClick={onClose}>{t('pwa.great')}</button>
      </div>
    </>
  );
}

export { INSTALL_DISMISSED_KEY };
