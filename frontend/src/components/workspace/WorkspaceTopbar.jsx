import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';

export default function WorkspaceTopbar({
  project,
  id,
  isRunning,
  isMeetingLive,
  awaitingPhase,
  completedCount,
  TOTAL_PLANNING,
  estMinutes,
  showEstTime,
  rateLimit,
  liveUrl,
  onCelebrate,
  onPause,
  onOpenSettings,
  onOpenMenu,
  onJoinMeeting,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="workspace-topbar">
      <button
        className="btn-ghost"
        onClick={() => navigate('/dashboard')}
        style={{ minHeight: 36, padding: '4px 12px' }}
        title={t('topbar.back')}
      >
        <ArrowForwardOutlined fontSize="small" />
        <span className="workspace-topbar__btn-label">{t('topbar.back')}</span>
      </button>

      <button
        className="btn-ghost"
        onClick={() => navigate(`/projects/${id}/tasks`)}
        style={{ minHeight: 36, padding: '4px 12px' }}
      >
        📋 <span className="workspace-topbar__btn-label">{t('topbar.tasks')}</span>
      </button>

      <button
        className="btn-ghost"
        onClick={onOpenSettings}
        style={{ minHeight: 36, padding: '4px 12px' }}
        title={t('topbar.settings')}
      >
        ⚙️ <span className="workspace-topbar__btn-label">{t('topbar.settings')}</span>
      </button>

      {isRunning && (
        <button
          className="btn-ghost"
          onClick={onPause}
          title={t('topbar.pause')}
          style={{ minHeight: 36, padding: '4px 10px', color: 'var(--danger)', fontSize: 13 }}
        >
          ⏸️ {t('topbar.pause')}
        </button>
      )}

      <div className="workspace-topbar__title">
        <span>⚡</span>
        <span className="workspace-topbar__project-name">{project?.title}</span>
      </div>

      <div className="workspace-progress">
        <div className="workspace-progress__fill" style={{ width: `${project?.completionPercent || 0}%` }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project?.completionPercent || 0}%</span>

      {isRunning && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {t('topbar.phaseOf', { current: completedCount + 1, total: TOTAL_PLANNING })}
        </span>
      )}

      {showEstTime && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {t('topbar.estMinutes', { n: estMinutes })}
        </span>
      )}

      {rateLimit && rateLimit.used > 0 && (
        <span
          title={rateLimit.resetsAt ? `מתאפס ב-${new Date(rateLimit.resetsAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}
          style={{
            fontSize: 11, whiteSpace: 'nowrap', cursor: 'default',
            color: rateLimit.remaining === 0 ? 'var(--danger)' : 'var(--text-muted)',
          }}
        >
          🚀 {rateLimit.remaining}/{rateLimit.maxPerHour} starts
        </span>
      )}

      <div className="workspace-topbar__status">
        {liveUrl && (
          <button className="badge badge--live" onClick={onCelebrate} style={{ cursor: 'pointer', border: 0 }}>
            {t('topbar.live')}
          </button>
        )}
        {isRunning && <span className="badge badge--pulse">{t('topbar.aiWorking')}</span>}
        {awaitingPhase != null && !isRunning && (
          <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            {t('topbar.awaitingApproval')}
          </span>
        )}
        {isMeetingLive && (
          <button
            className="btn btn--primary workspace-topbar__join-meeting"
            onClick={onJoinMeeting}
            style={{ fontSize: 12, padding: '4px 10px', minHeight: 32 }}
          >
            {t('topbar.joinMeeting')}
          </button>
        )}
      </div>

      <button className="btn-ghost workspace-topbar__hamburger" onClick={onOpenMenu} aria-label="תפריט">
        <MenuOutlined fontSize="small" />
      </button>
    </header>
  );
}
