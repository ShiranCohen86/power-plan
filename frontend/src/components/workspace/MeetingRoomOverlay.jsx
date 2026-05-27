import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEAM_MEMBERS } from '../../utils/phaseConfig';

const AVATAR_POSITIONS = {
  cto:      { top: '8%',  left: '30%' },
  pm:       { top: '8%',  left: '55%' },
  ux:       { top: '42%', left: '82%' },
  backend:  { top: '72%', left: '55%' },
  frontend: { top: '72%', left: '30%' },
  qa:       { top: '42%', left: '10%' },
  devops:   { top: '20%', left: '14%' },
  security: { top: '20%', left: '76%' },
};

function useAudio() {
  const ctxRef     = useRef(null);
  const ambientRef = useRef(null);

  function getCtx() {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }

  function startAmbient() {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      if (ambientRef.current) return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type      = 'triangle';
      osc.frequency.value = 60;
      gain.gain.value     = 0.018;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ambientRef.current = { osc, gain };
    } catch {}
  }

  function stopAmbient() {
    try {
      ambientRef.current?.osc.stop();
      ambientRef.current = null;
    } catch {}
  }

  function ding() {
    try {
      const ctx  = getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type      = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  return { startAmbient, stopAmbient, ding };
}

export default function MeetingRoomOverlay({ meetingMsgs, isMeetingLive, onClose }) {
  const { t } = useTranslation();
  const { startAmbient, stopAmbient, ding } = useAudio();
  const prevLenRef = useRef(0);

  const currentMsgs = (() => {
    const lastSepIdx = meetingMsgs.reduce((acc, m, i) => (m._isSeparator ? i : acc), -1);
    return meetingMsgs.slice(lastSepIdx + 1).filter((m) => !m._isSeparator);
  })();

  const lastMsg      = currentMsgs.at(-1) || null;
  const speakingRole = lastMsg?.role || null;

  useEffect(() => {
    startAmbient();
    return () => stopAmbient();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentMsgs.length > prevLenRef.current) {
      ding();
    }
    prevLenRef.current = currentMsgs.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMsgs.length]);

  useEffect(() => {
    if (!isMeetingLive && currentMsgs.length > 0) {
      const t = setTimeout(onClose, 2000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMeetingLive]);

  return (
    <div className="meeting-room-overlay">
      <button className="meeting-room__close" onClick={onClose} title={t('workspace.meeting.close')}>✕</button>

      {!isMeetingLive && currentMsgs.length > 0 && (
        <div className="meeting-room__ended-badge">{t('workspace.meeting.ended')}</div>
      )}

      <div className="meeting-room__scene">
        <div className="meeting-room__table" />

        {Object.entries(TEAM_MEMBERS).map(([key, member]) => {
          const pos       = AVATAR_POSITIONS[key] || { top: '50%', left: '50%' };
          const isSpeaking = speakingRole === key;
          return (
            <div
              key={key}
              className={`meeting-room__avatar${isSpeaking ? ' meeting-room__avatar--speaking' : ''}`}
              style={{ top: pos.top, left: pos.left }}
              title={`${member.name} — ${member.role}`}
            >
              <span className="meeting-room__avatar-emoji">{member.emoji}</span>
              <span className="meeting-room__avatar-name" style={{ color: member.color }}>
                {member.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="meeting-room__subtitles">
        {lastMsg ? (
          <>
            <span
              className="meeting-room__subtitle-name"
              style={{ color: TEAM_MEMBERS[lastMsg.role]?.color || '#fff' }}
            >
              {lastMsg.displayName || TEAM_MEMBERS[lastMsg.role]?.name || lastMsg.role}
            </span>
            <p className="meeting-room__subtitle-text" dir="rtl">{lastMsg.message}</p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pwa-spinner" style={{ width: 16, height: 16 }} />
            <p className="meeting-room__subtitle-text">{t('workspace.meeting.starting')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
