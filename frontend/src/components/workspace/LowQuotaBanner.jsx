import { useEffect, useState } from 'react';
import { checkFreeTierLimit } from '../../api/settings.api';

export default function LowQuotaBanner() {
  const [warn, setWarn] = useState(null);

  useEffect(() => {
    checkFreeTierLimit()
      .then((res) => {
        if (!res.ok && res.remaining === 0) {
          setWarn({ type: 'exhausted', msg: `Free tier pipeline limit reached (${res.limit}/month). Upgrade to Pro for unlimited pipelines.` });
        } else if (res.remaining != null && res.remaining <= 1) {
          setWarn({ type: 'low', msg: `${res.remaining} free pipeline(s) left this month.` });
        }
      })
      .catch(() => {});
  }, []);

  if (!warn) return null;

  return (
    <div className={`low-quota-banner low-quota-banner--${warn.type}`} role="alert">
      <span className="low-quota-banner__icon">{warn.type === 'exhausted' ? '🚫' : '⚠️'}</span>
      <span className="low-quota-banner__text">{warn.msg}</span>
    </div>
  );
}
