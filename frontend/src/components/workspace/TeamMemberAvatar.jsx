// status: 'idle' | 'working' | 'in-meeting' | 'just-finished'
import { useTranslation } from 'react-i18next';

export default function TeamMemberAvatar({ memberKey, member, status }) {
  const { t } = useTranslation();

  const statusLabel = {
    idle:           t('workspace.teamStatus.idle'),
    working:        t('workspace.teamStatus.working'),
    'in-meeting':   t('workspace.teamStatus.inMeeting'),
    'just-finished': t('workspace.teamStatus.justFinished'),
  }[status] || t('workspace.teamStatus.idle');

  return (
    <div
      className={`team-avatar team-avatar--${status}`}
      title={`${member.name} (${member.role}) — ${statusLabel}`}
    >
      <span className="team-avatar__emoji" style={{ background: member.color }}>
        {member.emoji}
      </span>
      <span className="team-avatar__dot" />
      <span className="team-avatar__name">{member.name}</span>
    </div>
  );
}
