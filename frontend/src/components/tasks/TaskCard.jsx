import { useDispatch } from 'react-redux';
import { changeTaskStatus } from '../../store/slices/tasksSlice';

const STATUS_OPTIONS = [
  'backlog', 'planning', 'in-progress', 'review', 'testing', 'deployed', 'blocked',
];

const PRIORITY_COLOR = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#6b7280',
};

const COMPLEXITY_LABEL = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' };

export default function TaskCard({ task, projectId }) {
  const dispatch = useDispatch();

  function handleStatusChange(e) {
    dispatch(changeTaskStatus({ projectId, taskId: task._id, status: e.target.value }));
  }

  return (
    <div className={`task-card task-card--${task.status}`}>
      <div className="task-card__header">
        <span
          className="task-card__priority-dot"
          style={{ background: PRIORITY_COLOR[task.priority] || '#6b7280' }}
          title={task.priority}
        />
        <span className="task-card__type">{task.type}</span>
        {task.complexity && (
          <span className="task-card__complexity">{COMPLEXITY_LABEL[task.complexity] || task.complexity}</span>
        )}
      </div>

      <p className="task-card__title">{task.title}</p>

      {task.description && (
        <p className="task-card__desc">{task.description}</p>
      )}

      <div className="task-card__footer">
        {task.estimatedHours > 0 && (
          <span className="task-card__hours">{task.estimatedHours}h</span>
        )}
        <select
          className="task-card__status-select"
          value={task.status}
          onChange={handleStatusChange}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
