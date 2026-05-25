import { useState } from 'react';
import FeatureGroup from './FeatureGroup';

export default function EpicGroup({ epic, projectId }) {
  const [open, setOpen] = useState(true);

  const totalTasks = (epic.features || []).reduce(
    (sum, f) => sum + (f.tasks || []).length, 0,
  );
  const doneTasks = (epic.features || []).reduce(
    (sum, f) => sum + (f.tasks || []).filter((t) => t.status === 'deployed').length, 0,
  );
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="epic-group">
      <button className="epic-group__header" onClick={() => setOpen((o) => !o)}>
        <span className="epic-group__toggle">{open ? '▾' : '▸'}</span>
        <span className="epic-group__title">{epic.title}</span>
        <div className="epic-group__progress">
          <div className="epic-group__progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <span className="epic-group__pct">{pct}%</span>
        <span className="epic-group__count">{doneTasks}/{totalTasks}</span>
      </button>

      {open && (
        <div className="epic-group__features">
          {(epic.features || []).map((feat, i) => (
            <FeatureGroup key={i} feature={feat} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}
