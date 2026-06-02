import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function MeetingCountdownBanner({ scheduledAt, isLive, onJoin }) {
  const { t } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (isLive || !scheduledAt) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((new Date(scheduledAt) - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [scheduledAt, isLive]);

  if (isLive) {
    return (
      <div className="meeting-countdown-banner meeting-countdown-banner--live">
        <span>
          <span className="live-dot" />
          {t('workspace.meeting.liveNow')}
        </span>
        <button className="btn btn--sm btn--primary" onClick={onJoin}>
          {t('workspace.meeting.joinNow')}
        </button>
      </div>
    );
  }

  return (
    <div className="meeting-countdown-banner">
      <span>{t('workspace.meeting.countdownLabel', { seconds: secondsLeft })}</span>
      <button className="btn btn--sm btn--ghost" onClick={onJoin}>
        {t('workspace.meeting.prepare')}
      </button>
    </div>
  );
}
