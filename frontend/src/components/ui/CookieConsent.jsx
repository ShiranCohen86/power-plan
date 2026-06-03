import { useState, useEffect } from 'react';

const CONSENT_KEY = 'pp-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie consent" aria-live="polite">
      <div className="cookie-consent__content">
        <p className="cookie-consent__text">
          We use essential cookies to keep you logged in and improve your experience.
          No tracking or advertising cookies.
        </p>
        <div className="cookie-consent__actions">
          <button className="btn btn--sm" onClick={accept}>Accept</button>
          <button className="btn btn--sm btn--ghost" onClick={decline}>Decline</button>
        </div>
      </div>
    </div>
  );
}
