import { PLANNING_PHASES, CODEGEN_PHASES } from '../../utils/phaseConfig';

const STATUS_ICON = {
  pending:           '⏳',
  running:           '🔄',
  completed:         '✅',
  failed:            '❌',
  awaiting_approval: '💛',
  interrupted:       '⏸️',
};

function PhaseItem({ config, phaseData, isActive, onClick }) {
  const status = phaseData?.status || 'pending';
  const icon   = STATUS_ICON[status] || '⏳';

  return (
    <button
      className={`phase-item phase-item--${status}${isActive ? ' phase-item--active' : ''}`}
      onClick={onClick}
      disabled={status === 'pending'}
    >
      <span className="phase-item__status">{icon}</span>
      <span className="phase-item__icon">{config.icon}</span>
      <span className="phase-item__name">{config.nameHe}</span>
      {status === 'running' && <span className="phase-item__pulse" />}
    </button>
  );
}

export default function PhaseList({ phases, activeIndex, onSelect }) {
  const phaseMap = Object.fromEntries(phases.map((p) => [p.index, p]));

  return (
    <div className="phase-list">
      <div className="phase-list__group">
        <div className="phase-list__group-label">📋 תכנון</div>
        {PLANNING_PHASES.map((cfg) => (
          <PhaseItem
            key={cfg.index}
            config={cfg}
            phaseData={phaseMap[cfg.index]}
            isActive={activeIndex === cfg.index}
            onClick={() => onSelect(cfg.index)}
          />
        ))}
      </div>

      <div className="phase-list__group">
        <div className="phase-list__group-label">⚙️ בנייה</div>
        {CODEGEN_PHASES.map((cfg) => (
          <PhaseItem
            key={cfg.index}
            config={cfg}
            phaseData={phaseMap[cfg.index]}
            isActive={activeIndex === cfg.index}
            onClick={() => onSelect(cfg.index)}
          />
        ))}
      </div>
    </div>
  );
}
