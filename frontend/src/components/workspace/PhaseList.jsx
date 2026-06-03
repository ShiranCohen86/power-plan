import React, { useState } from 'react';
import { PLANNING_PHASES, CODEGEN_PHASES } from '../../utils/phaseConfig';
import { useLanguage } from '../../context/LanguageContext.jsx';

const STATUS_ICON = {
  pending:           '⏳',
  running:           '🔄',
  completed:         '✅',
  failed:            '❌',
  awaiting_approval: '💛',
  interrupted:       '⏸️',
};

function fmtDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const s = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 > 0 ? ` ${s % 60}s` : ''}`;
}

function PhaseErrorModal({ message, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--danger)', borderRadius: 12, padding: '20px 24px', maxWidth: 480, width: '100%' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>❌</span>
          <strong style={{ fontSize: 14 }}>Phase Error Details</strong>
          <button onClick={onClose} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <pre style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: 300, overflow: 'auto' }}>
          {message}
        </pre>
      </div>
    </div>
  );
}

function PhaseItem({ config, phaseData, isActive, onClick, onRollback, lang }) {
  const status    = phaseData?.status || 'pending';
  const icon      = STATUS_ICON[status] || '⏳';
  const tokens    = phaseData?.tokensUsed;
  const duration  = status === 'completed' ? fmtDuration(phaseData?.startedAt, phaseData?.completedAt) : null;
  const refines   = phaseData?.refineCount || 0;
  const [showError, setShowError] = useState(false);

  return (
    <div className="phase-item-wrapper">
      <button
        className={`phase-item phase-item--${status}${isActive ? ' phase-item--active' : ''}`}
        onClick={onClick}
        disabled={status === 'pending'}
      >
        <span className="phase-item__status">{icon}</span>
        <span className="phase-item__icon">{config.icon}</span>
        <span className="phase-item__num">{config.index + 1}</span>
        <span className="phase-item__name">{lang === 'he' ? config.nameHe : config.name}</span>
        {status === 'running' && <span className="phase-item__pulse" />}
        {(tokens > 0 || duration) && status !== 'running' && status !== 'failed' && (
          <span className="phase-item__tokens" style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 'auto', opacity: 0.7 }}>
            {tokens > 0 && `${tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens}t`}
            {tokens > 0 && duration && ' · '}
            {duration}
          </span>
        )}
        {refines > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }} title={`Refined ${refines}x`}>
            ✏️{refines}
          </span>
        )}
        {status === 'failed' && phaseData?.errorMessage && (
          <button
            className="phase-item__error"
            onClick={(e) => { e.stopPropagation(); setShowError(true); }}
            style={{ fontSize: 10, color: 'var(--danger)', marginRight: 'auto', maxWidth: 80,
                     overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8,
                     background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'start' }}
          >
            {phaseData.errorMessage}
          </button>
        )}
        {showError && phaseData?.errorMessage && (
          <PhaseErrorModal message={phaseData.errorMessage} onClose={() => setShowError(false)} />
        )}
      </button>
      {onRollback && status === 'completed' && (
        <button
          className="phase-item__rollback"
          title={lang === 'he' ? `חזור לשלב ${config.index + 1}` : `Roll back to phase ${config.index + 1}`}
          onClick={(e) => {
            e.stopPropagation();
            const msg = lang === 'he'
              ? `חזרה לשלב ${config.index + 1} תמחק את כל התוצאות של השלבים הבאים. להמשיך?`
              : `Rolling back to phase ${config.index + 1} will erase all later phase results. Continue?`;
            if (window.confirm(msg)) onRollback(config.index);
          }}
        >
          ↩
        </button>
      )}
    </div>
  );
}

function PhaseList({ phases, activeIndex, onSelect, onRollback }) {
  const { lang } = useLanguage();
  const phaseMap = Object.fromEntries(phases.map((p) => [p.index, p]));

  const planningLabel = lang === 'he' ? '📋 תכנון'  : '📋 Planning';
  const buildingLabel = lang === 'he' ? '⚙️ בנייה' : '⚙️ Building';

  return (
    <div className="phase-list" role="navigation" aria-label="Pipeline phases">
      <div className="phase-list__group">
        <div className="phase-list__group-label">{planningLabel}</div>
        {PLANNING_PHASES.map((cfg) => (
          <PhaseItem
            key={cfg.index}
            config={cfg}
            phaseData={phaseMap[cfg.index]}
            isActive={activeIndex === cfg.index}
            onClick={() => onSelect(cfg.index)}
            onRollback={onRollback}
            lang={lang}
          />
        ))}
      </div>

      <div className="phase-list__group">
        <div className="phase-list__group-label">{buildingLabel}</div>
        {CODEGEN_PHASES.map((cfg) => (
          <PhaseItem
            key={cfg.index}
            config={cfg}
            phaseData={phaseMap[cfg.index]}
            isActive={activeIndex === cfg.index}
            onClick={() => onSelect(cfg.index)}
            onRollback={onRollback}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(PhaseList);
