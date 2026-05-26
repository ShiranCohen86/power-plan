import { useState, useRef, useEffect } from 'react';

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
  narrative, meetingMsgs, consultantMsgs = [], consultantsRunning = false,
  techLogs, isRunning, activeAgent,
}) {
  const [tab, setTab] = useState('narrative');
  const narrativeRef  = useRef(null);
  const meetingRef    = useRef(null);
  const consultRef    = useRef(null);
  const techRef       = useRef(null);

  // Auto-scroll narrative
  useEffect(() => {
    if (tab === 'narrative' && narrativeRef.current) {
      narrativeRef.current.scrollTop = narrativeRef.current.scrollHeight;
    }
  }, [narrative, tab]);

  // Auto-switch to meeting when internal meeting messages arrive
  useEffect(() => {
    if (meetingMsgs.length > 0) {
      setTab('meeting');
      setTimeout(() => {
        meetingRef.current?.scrollTo({ top: meetingRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [meetingMsgs.length]);

  // Auto-switch to consultants when external consultant messages arrive
  useEffect(() => {
    if (consultantMsgs.length > 0) {
      setTab('consultants');
      setTimeout(() => {
        consultRef.current?.scrollTo({ top: consultRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [consultantMsgs.length]);

  // Auto-scroll tech
  useEffect(() => {
    if (tab === 'tech' && techRef.current) {
      techRef.current.scrollTop = techRef.current.scrollHeight;
    }
  }, [techLogs, tab]);

  return (
    <aside className="live-feed">
      <div className="live-feed__tabs">
        <button
          className={`live-feed__tab${tab === 'narrative' ? ' live-feed__tab--active' : ''}`}
          onClick={() => setTab('narrative')}
        >
          🤔 Claude
        </button>
        <button
          className={`live-feed__tab${tab === 'meeting' ? ' live-feed__tab--active' : ''}`}
          onClick={() => setTab('meeting')}
        >
          🏢 ישיבה
          {meetingMsgs.length > 0 && (
            <span className="live-feed__badge">{meetingMsgs.length}</span>
          )}
        </button>
        <button
          className={`live-feed__tab${tab === 'consultants' ? ' live-feed__tab--active' : ''}`}
          onClick={() => setTab('consultants')}
        >
          🌐 יועצים
          {consultantsRunning && <span className="live-feed__dot-pulse" />}
          {!consultantsRunning && consultantMsgs.length > 0 && (
            <span className="live-feed__badge">{consultantMsgs.length}</span>
          )}
        </button>
        <button
          className={`live-feed__tab${tab === 'tech' ? ' live-feed__tab--active' : ''}`}
          onClick={() => setTab('tech')}
        >
          📊 טכני
        </button>
      </div>

      {/* Narrative tab */}
      {tab === 'narrative' && (
        <div className="live-feed__content" ref={narrativeRef}>
          {activeAgent && (
            <div className="live-feed__agent-badge">
              <span className="live-feed__agent-dot" />
              {activeAgent}
            </div>
          )}
          {narrative ? (
            <pre className="live-feed__text">{narrative}</pre>
          ) : (
            <div className="live-feed__empty">
              {isRunning ? (
                <>
                  <div className="pwa-spinner" style={{ width: 28, height: 28 }} />
                  <p>ממתין לתגובה מ-Claude...</p>
                </>
              ) : (
                <p>הנרטיב יופיע כאן בזמן שClaude עובד</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Internal meeting tab */}
      {tab === 'meeting' && (
        <div className="live-feed__content" ref={meetingRef}>
          {meetingMsgs.length === 0 ? (
            <div className="live-feed__empty">
              <p>הישיבה הפנימית תתחיל לאחר השלמת כל שלב</p>
            </div>
          ) : (
            <div className="live-feed__meeting">
              {meetingMsgs.map((msg, i) => (
                <div key={i} className={`meeting-msg meeting-msg--${msg.type}`}>
                  <div className="meeting-msg__header">
                    <span className="meeting-msg__avatar">{ROLE_EMOJI[msg.role] || '👤'}</span>
                    <span className="meeting-msg__name" style={{ color: safeColor(msg.color) }}>
                      {msg.displayName}
                    </span>
                    <span className={`meeting-msg__type-badge meeting-msg__type-badge--${msg.type}`}>
                      {msg.type}
                    </span>
                  </div>
                  <p className="meeting-msg__body">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* External consultants tab */}
      {tab === 'consultants' && (
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
              {/* Header */}
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
      {tab === 'tech' && (
        <div className="live-feed__content" ref={techRef}>
          {techLogs.length === 0 ? (
            <div className="live-feed__empty">
              <p>אירועי agent יופיעו כאן</p>
            </div>
          ) : (
            <div className="live-feed__tech">
              {techLogs.map((log, i) => (
                <div key={i} className={`tech-log tech-log--${log.event}`}>
                  <span className="tech-log__icon">{EVENT_ICON[log.event] || '•'}</span>
                  <div className="tech-log__body">
                    <span className="tech-log__agent">{log.agentName}</span>
                    <span className="tech-log__event">{log.event}</span>
                    {log.metadata?.tokensUsed && (
                      <span className="tech-log__tokens">{log.metadata.tokensUsed} tokens</span>
                    )}
                    {log.message && <p className="tech-log__msg">{log.message}</p>}
                  </div>
                  <span className="tech-log__time">
                    {new Date(log.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
