import React from 'react';
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

function PhaseItem({ config, phaseData, isActive, onClick, onRollback, lang }) {
  const status = phaseData?.status || 'pending';
  const icon   = STATUS_ICON[status] || '⏳';
  const tokens = phaseData?.tokensUsed;

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
        {tokens > 0 && status !== 'running' && status !== 'failed' && (
          <span className="phase-item__tokens" style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 'auto', opacity: 0.7 }}>
            {tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens}t
          </span>
        )}
        {status === 'failed' && phaseData?.errorMessage && (
          <span
            className="phase-item__error"
            title={phaseData.errorMessage}
            style={{ fontSize: 10, color: 'var(--danger)', marginRight: 'auto', maxWidth: 80,
                     overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}
          >
            {phaseData.errorMessage}
          </span>
        )}
      </button>
      {onRollback && status === 'completed' && (
        <button
          className="phase-item__rollback"
          title={lang === 'he' ? `חזור לשלב ${config.index + 1}` : `Roll back to phase ${config.index + 1}`}
          onClick={(e) => { e.stopPropagation(); onRollback(config.index); }}
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
    <div className="phase-list">
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
