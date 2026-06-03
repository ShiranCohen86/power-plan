import React, { useRef, useEffect, useState } from 'react';
import { listFiles, getFileContent } from '../../api/files.api';
import { useTranslation } from 'react-i18next';
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

const SAFE_COLOR_RE  = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{2,30})$/;
const SCROLL_DELAY_MS = 50;
const safeColor = (c) => (c && SAFE_COLOR_RE.test(c) ? c : undefined);

const EVENT_ICON = {
  started:      '▶️',
  completed:    '✅',
  error:        '❌',
  file_written: '📄',
  narrative:    '💬',
};

function LiveFeed({
  meetingMsgs, consultantMsgs = [], consultantsRunning = false,
  techLogs, isRunning,
  activeTab, onTabChange,
  scheduledMeeting, isMeetingLive, missedMeeting, onClearMissed, onJoinMeeting,
  activePhaseIndex, projectId, hasGeneratedFiles,
}) {
  const { t } = useTranslation();
  const meetingRef   = useRef(null);
  const consultRef   = useRef(null);
  const [files, setFiles]           = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent]   = useState(null);
  const techRef      = useRef(null);

  useEffect(() => {
    if (meetingMsgs.length > 0 && activeTab !== 'meeting') {
      onTabChange('meeting');
    }
    if (meetingMsgs.length > 0) {
      setTimeout(() => {
        meetingRef.current?.scrollTo({ top: meetingRef.current.scrollHeight, behavior: 'smooth' });
      }, SCROLL_DELAY_MS);
    }
  // intentional: only react to message count changes, not tab/scroll state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingMsgs.length]);

  useEffect(() => {
    if (consultantMsgs.length > 0) {
      onTabChange('consultants');
      setTimeout(() => {
        consultRef.current?.scrollTo({ top: consultRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  // intentional: only react to consultant message count changes, not tab state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantMsgs.length]);

  useEffect(() => {
    if (activeTab === 'tech' && techRef.current) {
      techRef.current.scrollTop = techRef.current.scrollHeight;
    }
  }, [techLogs, activeTab]);

  useEffect(() => {
    if (activeTab === 'files' && projectId && files === null) {
      listFiles(projectId).then((r) => setFiles(r.files || [])).catch(() => setFiles([]));
    }
  }, [activeTab, projectId, files]);

  function getMemberStatus(key) {
    if (isMeetingLive) return 'in-meeting';
    if (isRunning && PHASE_LEAD[activePhaseIndex] === key) return 'working';
    return 'idle';
  }

  return (
    <aside className="live-feed" aria-label="Live feed" role="complementary">
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

      {(scheduledMeeting || isMeetingLive) && (
        <div style={{ padding: '0 8px 0' }}>
          <MeetingCountdownBanner
            scheduledAt={scheduledMeeting?.scheduledAt}
            isLive={isMeetingLive}
            onJoin={onJoinMeeting}
          />
        </div>
      )}

      <div className="live-feed__tabs">
        <button
          className={`live-feed__tab${activeTab === 'meeting' ? ' live-feed__tab--active' : ''}`}
          onClick={() => onTabChange('meeting')}
        >
          {t('workspace.feed.tabMeeting')}
          {meetingMsgs.length > 0 && (
            <span className="live-feed__badge">{meetingMsgs.length}</span>
          )}
          {isMeetingLive && <span className="live-feed__dot-pulse" />}
        </button>
        <button
          className={`live-feed__tab${activeTab === 'consultants' ? ' live-feed__tab--active' : ''}`}
          onClick={() => onTabChange('consultants')}
        >
          {t('workspace.feed.tabAdvisors')}
          {consultantsRunning && <span className="live-feed__dot-pulse" />}
          {!consultantsRunning && consultantMsgs.length > 0 && (
            <span className="live-feed__badge">{consultantMsgs.length}</span>
          )}
        </button>
        <button
          className={`live-feed__tab${activeTab === 'tech' ? ' live-feed__tab--active' : ''}`}
          onClick={() => onTabChange('tech')}
        >
          {t('workspace.feed.tabTech')}
        </button>
        {hasGeneratedFiles && (
          <button
            className={`live-feed__tab${activeTab === 'files' ? ' live-feed__tab--active' : ''}`}
            onClick={() => onTabChange('files')}
          >
            {t('workspace.feed.tabFiles')}
          </button>
        )}
        {meetingMsgs.length > 0 && (
          <button
            className="live-feed__tab"
            title={t('workspace.feed.downloadTranscript')}
            onClick={() => {
              const lines = meetingMsgs
                .filter((m) => !m._isSeparator)
                .map((m) => `[${m.displayName || '?'}] ${m.message}`)
                .join('\n');
              const blob = new Blob([lines], { type: 'text/plain' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = 'meeting-transcript.txt'; document.body.appendChild(a); a.click(); a.remove();
            }}
          >
            ⬇️
          </button>
        )}
      </div>

      {activeTab === 'meeting' && (
        <div className="live-feed__content" ref={meetingRef}>
          {missedMeeting && (
            <div className="missed-meeting-banner">
              <span>{t('workspace.feed.missedMeeting')}</span>
              <button onClick={onClearMissed}>✕</button>
            </div>
          )}

          {(() => {
            const lastSepIdx = [...meetingMsgs].map((m, i) => m._isSeparator ? i : -1).filter(i => i >= 0);
            const startIdx   = lastSepIdx.length ? lastSepIdx[lastSepIdx.length - 1] + 1 : 0;
            const currentMsgs = meetingMsgs.slice(startIdx).filter(m => !m._isSeparator);

            if (currentMsgs.length === 0 && !isMeetingLive) {
              return (
                <div className="live-feed__empty">
                  <p>{t('workspace.feed.meetingAfterPhase')}</p>
                </div>
              );
            }
            const regularMsgs = currentMsgs.filter((m) => m.type !== 'decision');
            const decisionMsg = currentMsgs.find((m) => m.type === 'decision');
            return (
              <div className="live-feed__meeting">
                {regularMsgs.map((msg, i) => (
                  <div key={msg._id || i} className="meeting-msg">
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
                    {t('workspace.feed.teamDiscussing')}
                  </div>
                )}
                {decisionMsg && (
                  <div className="meeting-decision">
                    <span className="meeting-decision__label">{t('workspace.feed.decisionLabel')}</span>
                    <p className="meeting-decision__text" dir="rtl">{decisionMsg.message}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'consultants' && (
        <div className="live-feed__content" ref={consultRef}>
          {consultantMsgs.length === 0 ? (
            <div className="live-feed__empty">
              {consultantsRunning ? (
                <>
                  <div className="pwa-spinner" style={{ width: 28, height: 28 }} />
                  <p>{t('workspace.feed.advisorsReviewing')}</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 28 }}>🌐</p>
                  <p>{t('workspace.feed.advisorsAfter')}</p>
                </>
              )}
            </div>
          ) : (
            <div className="live-feed__meeting">
              <div className="consultants-header">
                <span className="consultants-header__badge">External Review</span>
                <span className="consultants-header__title">{t('workspace.feed.specReview')}</span>
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
                  {t('workspace.feed.advisorsReviewing')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tech' && (
        <div className="live-feed__content" ref={techRef}>
          {techLogs.length === 0 ? (
            <div className="live-feed__empty">
              <p>{t('workspace.feed.noEvents')}</p>
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

      {activeTab === 'files' && (
        <div className="live-feed__content">
          {files === null ? (
            <div className="live-feed__empty"><div className="pwa-spinner" /></div>
          ) : files.length === 0 ? (
            <div className="live-feed__empty"><p>{t('workspace.feed.noFiles')}</p></div>
          ) : selectedFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <button onClick={() => { setSelectedFile(null); setFileContent(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>←</button>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dir="ltr">
                  {selectedFile}
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {fileContent === null ? (
                  <div style={{ padding: 16 }}><div className="pwa-spinner" /></div>
                ) : (
                  <pre style={{ margin: 0, padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text)', whiteSpace: 'pre', overflowX: 'auto', background: 'transparent' }} dir="ltr">
                    {fileContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="live-feed__files">
              {files.map((f) => (
                <div key={f.filePath} className="file-entry" style={{ cursor: 'pointer' }}
                  onClick={async () => {
                    setSelectedFile(f.filePath); setFileContent(null);
                    try {
                      const res = await getFileContent(projectId, f.filePath);
                      setFileContent(res.content);
                    } catch { setFileContent('// Could not load file'); }
                  }}>
                  <span className="file-entry__lang">{f.language}</span>
                  <span className="file-entry__path" dir="ltr">{f.filePath}</span>
                  <span className={`file-entry__status file-entry__status--${f.status}`}>{f.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default React.memo(LiveFeed);
