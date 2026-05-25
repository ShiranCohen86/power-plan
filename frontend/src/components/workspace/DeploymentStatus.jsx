const STEPS = [
  { key: 'mongo',      icon: '🗄️',  label: 'מסד נתונים' },
  { key: 'cloudinary', icon: '🖼️',  label: 'אחסון מדיה' },
  { key: 'github',     icon: '📦',  label: 'GitHub Repo' },
  { key: 'push',       icon: '⬆️',  label: 'העלאת קוד' },
  { key: 'render',     icon: '🚀',  label: 'פרסום באינטרנט' },
];

export default function DeploymentStatus({ steps, liveUrl, failed }) {
  // steps: { [key]: { status: 'running'|'done', label: string } }

  return (
    <div className="deploy-status">
      <h3 className="deploy-status__title">
        {liveUrl ? '🎉 האפליקציה חיה!' : failed ? '❌ הפרסום נכשל' : '🚀 מפרסם את האפליקציה...'}
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
              פתח אפליקציה ↗
            </a>
            <button
              className="btn btn--secondary"
              onClick={() => navigator.clipboard.writeText(liveUrl)}
            >
              העתק לינק
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p className="deploy-status__error">
          הפרסום נכשל. ניתן לנסות שוב מהגדרות הפרויקט.
        </p>
      )}
    </div>
  );
}
