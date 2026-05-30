import { useState } from 'react';
import TaskCard from './TaskCard';

export default function FeatureGroup({ feature, projectId }) {
  const [open, setOpen] = useState(true);
  const tasks = feature.tasks || [];
  const done  = tasks.filter((t) => t.status === 'deployed').length;

  return (
    <div className="feature-group">
      <button className="feature-group__header" onClick={() => setOpen((o) => !o)}>
        <span className="feature-group__toggle">{open ? '▾' : '▸'}</span>
        <span className="feature-group__name">{feature.title}</span>
        <span className="feature-group__count">{done}/{tasks.length}</span>
      </button>

      {open && (
        <div className="feature-group__tasks">
          {tasks.length === 0 ? (
            <p className="feature-group__empty">אין משימות</p>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task._id} task={task} projectId={projectId} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
