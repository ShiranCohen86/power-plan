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

function PhaseItem({ config, phaseData, isActive, onClick, lang }) {
  const status = phaseData?.status || 'pending';
  const icon   = STATUS_ICON[status] || '⏳';
  const tokens = phaseData?.tokensUsed;

  return (
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
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 'auto', opacity: 0.7 }}>
          {tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens}t
        </span>
      )}
      {status === 'failed' && phaseData?.errorMessage && (
        <span
          title={phaseData.errorMessage}
          style={{ fontSize: 10, color: 'var(--danger)', marginRight: 'auto', maxWidth: 80,
                   overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}
        >
          {phaseData.errorMessage}
        </span>
      )}
    </button>
  );
}

export default function PhaseList({ phases, activeIndex, onSelect }) {
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
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}
