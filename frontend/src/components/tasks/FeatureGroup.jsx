import { useState } from 'react';
import TaskCard from './TaskCard';

export default function FeatureGroup({ feature, projectId }) {
  const [open, setOpen] = useState(true);
  const done = (feature.tasks || []).filter((t) => t.status === 'deployed').length;

  return (
    <div className="feature-group">
      <button className="feature-group__header" onClick={() => setOpen((o) => !o)}>
        <span className="feature-group__toggle">{open ? '▾' : '▸'}</span>
        <span className="feature-group__name">{feature.title}</span>
        <span className="feature-group__count">{done}/{(feature.tasks || []).length}</span>
      </button>

      {open && (
        <div className="feature-group__tasks">
          {(feature.tasks || []).length === 0 ? (
            <p className="feature-group__empty">אין משימות</p>
          ) : (
            (feature.tasks || []).map((task) => (
              <TaskCard key={task._id} task={task} projectId={projectId} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
