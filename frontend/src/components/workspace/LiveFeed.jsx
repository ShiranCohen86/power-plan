import { useRef, useEffect } from 'react';
import { TEAM_MEMBERS, PHASE_LEAD } from '../../utils/phaseConfig';
import MeetingCountdownBanner from './MeetingCountdownBanner';
import TeamMemberAvatar from './TeamMemberAvatar';

const ROLE_EMOJI = {
  cto: '🏗️', pm: '👨‍💼', ux: '🎨', backend: '⚙️',
  frontend: '🖥️', qa: '✅', devops: '🚀', security: '🔒', facilitator: '🎯',
};

const CONSULTANT_EMOJI = {
  nir:  '👤',
  oren: '🔒',
  mia:  '💻',
};

const SAFE_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{2,30})$/;
const safeColor = (c) => (c && SAFE_COLOR_RE.test(c) ? c : undefined);

const EVENT_ICON = {
  started:      '▶️',
  completed:    '✅',
  error:        '❌',
  file_written: '📄',
  narrative:    '💬',
};

export default function LiveFeed({
  meetingMsgs, consultantMsgs = [], consultantsRunning = false,
  techLogs, isRunning,
  // Controlled tab
  activeTab, onTabChange,
  // Live Company Experience
  scheduledMeeting, isMeetingLive, missedMeeting, onClearMissed, onJoinMeeting,
  activePhaseIndex,
}) {
  const meetingRef   = useRef(null);
  const consultRef   = useRef(null);
  const techRef      = useRef(null);

  // Auto-switch to meeting when messages arrive (only if not already there)
  useEffect(() => {
    if (meetingMsgs.length > 0 && activeTab !== 'meeting') {
      onTabChange('meeting');
    }
    if (meetingMsgs.length > 0) {
      setTimeout(() => {
        meetingRef.current?.scrollTo({ top: meetingRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingMsgs.length]);

  // Auto-switch to consultants when consultant messages arrive
  useEffect(() => {
    if (consultantMsgs.length > 0) {
      onTabChange('consultants');
      setTimeout(() => {
        consultRef.current?.scrollTo({ top: consultRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantMsgs.length]);

  // Auto-scroll tech log
  useEffect(() => {
    if (activeTab === 'tech' && techRef.current) {
      techRef.current.scrollTop = techRef.current.scrollHeight;
    }
  }, [techLogs, activeTab]);

  // Compute team member statuses
  function getMemberStatus(key) {
    if (isMeetingLive) return 'in-meeting';
    if (isRunning && PHASE_LEAD[activePhaseIndex] === key) return 'working';
    return 'idle';
  }

  return (
    <aside className="live-feed">
      {/* Team status strip — always visible */}
      {isMeetingLive && (
        <div className="team-status-strip">
          {Object.entries(TEAM_MEMBERS).map(([key, member]) => (
            <TeamMemberAvatar
              key={key}
              memberKey={key}
              member={member}
              status={getMemberStatus(key)}
            />
          ))}
        </div>
      )}

      {/* Meeting countdown / live banner */}
      {(scheduledMeeting || isMeetingLive) && (
        <div style={{ padding: '0 8px 0' }}>
          <MeetingCountdownBanner
            scheduledAt={scheduledMeeting?.scheduledAt}
            isLive={isMeetingLive}
            onJoin={onJoinMeeting}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="live-feed__tabs">
        <button
          className={`live-feed__tab${activeTab === 'meeting' ? ' live-feed__tab--active' : ''}`}
          onClick={() => onTabChange('meeting')}
        >
          🏢 ישיבה
          {meetingMsgs.length > 0 && (
            <span className="live-feed__badge">{meetingMsgs.length}</span>
          )}
          {isMeetingLive && <span className="live-feed__dot-pulse" />}
        </button>
        <button
          className={`live-feed__tab${activeTab === 'consultants' ? ' live-feed__tab--active' : ''}`}
          onClick={() => onTabChange('consultants')}
        >
          🌐 יועצים
          {consultantsRunning && <span className="live-feed__dot-pulse" />}
          {!consultantsRunning && consultantMsgs.length > 0 && (
            <span className="live-feed__badge">{consultantMsgs.length}</span>
          )}
        </button>
        <button
          className={`live-feed__tab${activeTab === 'tech' ? ' live-feed__tab--active' : ''}`}
          onClick={() => onTabChange('tech')}
        >
          📊 טכני
        </button>
      </div>

      {/* Meeting tab */}
      {activeTab === 'meeting' && (
        <div className="live-feed__content" ref={meetingRef}>
          {/* Missed meeting banner */}
          {missedMeeting && (
            <div className="missed-meeting-banner">
              <span>📋 פספסת את הפגישה — הנה הסיכום</span>
              <button onClick={onClearMissed}>✕</button>
            </div>
          )}

          {(() => {
            // Show only the current meeting — messages after the last separator
            const lastSepIdx = [...meetingMsgs].map((m, i) => m._isSeparator ? i : -1).filter(i => i >= 0);
            const startIdx   = lastSepIdx.length ? lastSepIdx[lastSepIdx.length - 1] + 1 : 0;
            const currentMsgs = meetingMsgs.slice(startIdx).filter(m => !m._isSeparator);

            if (currentMsgs.length === 0 && !isMeetingLive) {
              return (
                <div className="live-feed__empty">
                  <p>הישיבה הפנימית תתחיל לאחר השלמת כל שלב</p>
                </div>
              );
            }
            return (
              <div className="live-feed__meeting">
                {currentMsgs.map((msg, i) => (
                  <div key={i} className="meeting-msg">
                    <div className="meeting-msg__header">
                      <span className="meeting-msg__avatar">{ROLE_EMOJI[msg.role] || '👤'}</span>
                      <span className="meeting-msg__name" style={{ color: safeColor(msg.color) }}>
                        {msg.displayName}
                      </span>
                      <span className="meeting-msg__role">
                        {TEAM_MEMBERS[msg.role]?.role || msg.role}
                      </span>
                    </div>
                    <p className="meeting-msg__body" dir="rtl">{msg.message}</p>
                  </div>
                ))}
                {isMeetingLive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <div className="pwa-spinner" style={{ width: 16, height: 16 }} />
                    הצוות דן...
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* External consultants tab */}
      {activeTab === 'consultants' && (
        <div className="live-feed__content" ref={consultRef}>
          {consultantMsgs.length === 0 ? (
            <div className="live-feed__empty">
              {consultantsRunning ? (
                <>
                  <div className="pwa-spinner" style={{ width: 28, height: 28 }} />
                  <p>היועצים החיצוניים בודקים את האפיון...</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 28 }}>🌐</p>
                  <p>היועצים החיצוניים יבדקו את האפיון לאחר השלמת 12 שלבי התכנון</p>
                </>
              )}
            </div>
          ) : (
            <div className="live-feed__meeting">
              <div className="consultants-header">
                <span className="consultants-header__badge">External Review</span>
                <span className="consultants-header__title">סקירת אפיון — Round 1</span>
              </div>

              {consultantMsgs.map((msg, i) => (
                <div key={i} className={`meeting-msg meeting-msg--${msg.type} meeting-msg--external`}>
                  <div className="meeting-msg__header">
                    <span className="meeting-msg__avatar">
                      {msg.emoji || CONSULTANT_EMOJI[msg.consultantId] || '🌐'}
                    </span>
                    <div className="meeting-msg__name-block">
                      <span className="meeting-msg__name" style={{ color: safeColor(msg.color) }}>
                        {msg.name}
                      </span>
                      <span className="meeting-msg__subrole">{msg.role}</span>
                    </div>
                    <span className={`meeting-msg__type-badge meeting-msg__type-badge--${msg.type}`}>
                      {msg.type}
                    </span>
                  </div>
                  <p className="meeting-msg__body">{msg.message}</p>
                </div>
              ))}

              {consultantsRunning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  <div className="pwa-spinner" style={{ width: 16, height: 16 }} />
                  בודקים...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tech log tab */}
      {activeTab === 'tech' && (
        <div className="live-feed__content" ref={techRef}>
          {techLogs.length === 0 ? (
            <div className="live-feed__empty">
              <p>אירועי agent יופיעו כאן</p>
            </div>
          ) : (
            <div className="live-feed__tech">
              {techLogs.map((log, i) => (
                <div key={i} className={`tech-log tech-log--${log.event}`}>
                  <div className="tech-log__line">
                    <span className="tech-log__icon">{EVENT_ICON[log.event] || '•'}</span>
                    <span className="tech-log__agent">{log.agentName}</span>
                    {log.event !== 'file_written' && <span className="tech-log__sep">—</span>}
                    <span className="tech-log__event">{log.event}</span>
                    {log.metadata?.tokensUsed && (
                      <span className="tech-log__tokens">· {log.metadata.tokensUsed.toLocaleString()} tokens</span>
                    )}
                    <span className="tech-log__time">
                      {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  {log.message && <p className="tech-log__msg">{log.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
