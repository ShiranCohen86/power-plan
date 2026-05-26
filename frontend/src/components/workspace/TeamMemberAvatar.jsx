// status: 'idle' | 'working' | 'in-meeting' | 'just-finished'
export default function TeamMemberAvatar({ memberKey, member, status }) {
  const statusLabel = {
    idle:          'זמין',
    working:       'עובד',
    'in-meeting':  'בפגישה',
    'just-finished': 'סיים',
  }[status] || 'זמין';

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
