import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';

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
  liveGithubUrl,
  totalTokensUsed,
  onCelebrate,
  onPause,
  onOpenSettings,
  onJoinMeeting,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="workspace-topbar">
      <button
        className="workspace-topbar__action-btn btn-ghost"
        onClick={() => navigate('/dashboard')}
        title={t('topbar.back')}
      >
        <ArrowForwardOutlined fontSize="small" />
        <span className="workspace-topbar__btn-label">{t('topbar.back')}</span>
      </button>

      <button
        className="workspace-topbar__action-btn btn-ghost"
        onClick={() => navigate(`/projects/${id}/tasks`)}
      >
        📋 <span className="workspace-topbar__btn-label">{t('topbar.tasks')}</span>
      </button>

      <button
        className="workspace-topbar__action-btn btn-ghost"
        onClick={onOpenSettings}
        title={t('topbar.settings')}
      >
        ⚙️ <span className="workspace-topbar__btn-label">{t('topbar.settings')}</span>
      </button>

      {isRunning && (
        <button
          className="workspace-topbar__action-btn btn-ghost workspace-topbar__action-btn--danger"
          onClick={onPause}
          title={t('topbar.pause')}
        >
          ⏸️ {t('topbar.pause')}
        </button>
      )}

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

      {totalTokensUsed > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
          title="Total tokens used across all phases">
          {totalTokensUsed >= 1000 ? `${(totalTokensUsed / 1000).toFixed(1)}k` : totalTokensUsed} tokens
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
        {liveGithubUrl && (
          <a href={liveGithubUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }} title="GitHub Repo">
            ⭐ GitHub
          </a>
        )}
        {isRunning && <span className="badge badge--pulse">{t('topbar.aiWorking')}</span>}
        {awaitingPhase != null && !isRunning && (
          <span className="badge" style={{ background: 'var(--brand-primary-alpha-10)', color: 'var(--warning)' }}>
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

    </header>
  );
}
