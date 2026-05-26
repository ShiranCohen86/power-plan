import { useState, useEffect } from 'react';

export default function MeetingCountdownBanner({ scheduledAt, isLive, onJoin }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (isLive || !scheduledAt) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((new Date(scheduledAt) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [scheduledAt, isLive]);

  if (isLive) {
    return (
      <div className="meeting-countdown-banner meeting-countdown-banner--live">
        <span>
          <span className="live-dot" />
          הצוות בפגישה עכשיו
        </span>
        <button className="btn btn--sm btn--primary" onClick={onJoin}>
          הצטרף →
        </button>
      </div>
    );
  }

  return (
    <div className="meeting-countdown-banner">
      <span>🗓 פגישת צוות מתחילה בעוד {secondsLeft}s</span>
      <button className="btn btn--sm btn--ghost" onClick={onJoin}>
        התכונן →
      </button>
    </div>
  );
}
