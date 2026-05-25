import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSprints, selectSprints } from '../../store/slices/sprintsSlice';
import { fetchTasksBySprint, selectSprintTasks } from '../../store/slices/tasksSlice';
import TaskCard from './TaskCard';

const STATUS_COLUMNS = [
  { key: 'backlog',     label: 'Backlog' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'review',      label: 'Review' },
  { key: 'deployed',    label: 'Done' },
];

function SprintColumn({ status, tasks, projectId }) {
  const filtered = tasks.filter((t) => t.status === status);
  return (
    <div className="sprint-column">
      <div className="sprint-column__header">
        <span>{STATUS_COLUMNS.find((c) => c.key === status)?.label || status}</span>
        <span className="sprint-column__count">{filtered.length}</span>
      </div>
      <div className="sprint-column__tasks">
        {filtered.map((t) => (
          <TaskCard key={t._id} task={t} projectId={projectId} />
        ))}
        {filtered.length === 0 && <p className="sprint-column__empty">—</p>}
      </div>
    </div>
  );
}

function SingleSprintView({ sprint, projectId }) {
  const dispatch = useDispatch();
  const tasks    = useSelector(selectSprintTasks(projectId, sprint.index));

  useEffect(() => {
    dispatch(fetchTasksBySprint({ projectId, sprintIndex: sprint.index }));
  }, [dispatch, projectId, sprint.index]);

  return (
    <div className="sprint-board__sprint">
      <div className="sprint-board__sprint-header">
        <h3 className="sprint-board__sprint-name">{sprint.name}</h3>
        <span className={`sprint-board__sprint-status sprint-board__sprint-status--${sprint.status}`}>
          {sprint.status}
        </span>
        <span className="sprint-board__sprint-tasks">
          {sprint.completedTaskCount}/{sprint.taskCount} tasks
        </span>
      </div>

      {sprint.ceremonies?.planning && (
        <p className="sprint-board__ceremony">
          <strong>Planning:</strong> {sprint.ceremonies.planning}
        </p>
      )}

      <div className="sprint-board__columns">
        {STATUS_COLUMNS.map((col) => (
          <SprintColumn key={col.key} status={col.key} tasks={tasks} projectId={projectId} />
        ))}
      </div>
    </div>
  );
}

export default function SprintBoard({ projectId }) {
  const dispatch = useDispatch();
  const sprints  = useSelector(selectSprints(projectId));

  useEffect(() => {
    dispatch(fetchSprints(projectId));
  }, [dispatch, projectId]);

  if (!sprints.length) {
    return (
      <div className="sprint-board__empty">
        <p>הספרינטים יוצרו אוטומטית אחרי שלב ה-Dev Planning.</p>
      </div>
    );
  }

  return (
    <div className="sprint-board">
      {sprints.map((sprint) => (
        <SingleSprintView key={sprint._id} sprint={sprint} projectId={projectId} />
      ))}
    </div>
  );
}
