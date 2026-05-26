import { useNavigate } from 'react-router-dom';

export default function QuotaBanner({ message, plan, projectId }) {
  const navigate = useNavigate();

  const isStarter = plan === 'starter';

  return (
    <div className="quota-banner">
      <div className="quota-banner__icon">⚠️</div>
      <div className="quota-banner__body">
        <p className="quota-banner__title">העבודה על הפרויקט הופסקה זמנית</p>
        <p className="quota-banner__msg">
          {message || 'אזל הקרדיט לשירות ה-AI.'}
        </p>
        {isStarter ? (
          <div className="quota-banner__steps">
            <p className="quota-banner__steps-title">כיצד לחדש:</p>
            <ol>
              <li>היכנס ל-<strong>console.anthropic.com</strong></li>
              <li>לחץ <strong>Billing</strong> → <strong>Add credits</strong></li>
              <li>הוסף לפחות $5 (מספיק לעשרות פרויקטים נוספים)</li>
              <li>חזור לכאן ולחץ <strong>המשך בנייה</strong></li>
            </ol>
          </div>
        ) : (
          <p className="quota-banner__pro-msg">
            אנא צור קשר עם תמיכת Power Plan ונחדש את הפרויקט שלך בהקדם.{' '}
            <a href="mailto:support@powerplan.app" className="quota-banner__contact-link">
              support@powerplan.app →
            </a>
          </p>
        )}
      </div>
      <div className="quota-banner__actions">
        {isStarter && (
          <a
            href="https://console.anthropic.com/settings/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary"
          >
            תדלוק קרדיט ↗
          </a>
        )}
        <button className="btn btn--secondary" onClick={() => navigate('/settings')}>
          הגדרות חשבון
        </button>
      </div>
    </div>
  );
}
