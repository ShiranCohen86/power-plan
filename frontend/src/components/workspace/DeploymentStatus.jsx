import { useTranslation } from 'react-i18next';

export default function DeploymentStatus({ steps, liveUrl, failed }) {
  const { t } = useTranslation();

  const STEPS = [
    { key: 'mongo',      icon: '🗄️',  label: t('workspace.deploy.steps.database') },
    { key: 'cloudinary', icon: '🖼️',  label: t('workspace.deploy.steps.media') },
    { key: 'github',     icon: '📦',  label: t('workspace.deploy.steps.github') },
    { key: 'push',       icon: '⬆️',  label: t('workspace.deploy.steps.upload') },
    { key: 'render',     icon: '🚀',  label: t('workspace.deploy.steps.publish') },
  ];

  return (
    <div className="deploy-status">
      <h3 className="deploy-status__title">
        {liveUrl ? t('workspace.deploy.live') : failed ? t('workspace.deploy.failed') : t('workspace.deploy.running')}
      </h3>

      <div className="deploy-status__steps">
        {STEPS.map((step) => {
          const s = steps[step.key];
          const status = s?.status || 'pending';
          return (
            <div key={step.key} className={`deploy-step deploy-step--${status}`}>
              <span className="deploy-step__icon">
                {status === 'done'    ? '✓' :
                 status === 'running' ? <span className="deploy-step__spinner" /> :
                 step.icon}
              </span>
              <span className="deploy-step__label">{s?.label || step.label}</span>
            </div>
          );
        })}
      </div>

      {liveUrl && (
        <div className="deploy-status__live">
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="deploy-status__link"
          >
            {liveUrl}
          </a>
          <div className="deploy-status__live-actions">
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              {t('workspace.deploy.openApp')}
            </a>
            <button
              className="btn btn--secondary"
              onClick={() => navigator.clipboard.writeText(liveUrl)}
            >
              {t('workspace.deploy.copyLink')}
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p className="deploy-status__error">
          {t('workspace.deploy.failedMsg')}
        </p>
      )}
    </div>
  );
}
