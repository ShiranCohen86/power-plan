import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { fetchEpicTree, selectEpicTree, selectTasksStatus } from '../store/slices/tasksSlice';
import { selectProjectById } from '../store/slices/projectsSlice';
import EpicGroup from '../components/tasks/EpicGroup';
import SprintBoard from '../components/tasks/SprintBoard';

const VIEWS = [
  { key: 'epics',   label: 'אפיקים ופיצ\'רים' },
  { key: 'sprints', label: 'לוח ספרינטים' },
];

export default function TaskManagement() {
  const { id: projectId } = useParams();
  const dispatch           = useDispatch();
  const project            = useSelector(selectProjectById(projectId));
  const epics              = useSelector(selectEpicTree(projectId));
  const status             = useSelector(selectTasksStatus);
  const [view, setView]    = useState('epics');

  useEffect(() => {
    dispatch(fetchEpicTree(projectId));
  }, [dispatch, projectId]);

  const totalTasks = epics.reduce(
    (sum, e) => sum + (e.features || []).reduce((s, f) => s + (f.tasks || []).length, 0), 0,
  );
  const doneTasks = epics.reduce(
    (sum, e) => sum + (e.features || []).reduce(
      (s, f) => s + (f.tasks || []).filter((t) => t.status === 'deployed').length, 0,
    ), 0,
  );

  return (
    <div className="task-management">
      <div className="task-management__header">
        <div className="task-management__breadcrumb">
          <Link to="/dashboard" className="task-management__back">← דשבורד</Link>
          {project && (
            <>
              <span className="task-management__sep">/</span>
              <Link to={`/projects/${projectId}/workspace`} className="task-management__back">
                {project.title}
              </Link>
            </>
          )}
          <span className="task-management__sep">/</span>
          <span>משימות</span>
        </div>

        <div className="task-management__stats">
          <span className="task-management__stat">
            <strong>{totalTasks}</strong> משימות
          </span>
          <span className="task-management__stat">
            <strong>{doneTasks}</strong> הושלמו
          </span>
          <span className="task-management__stat">
            <strong>{epics.length}</strong> אפיקים
          </span>
        </div>
      </div>

      <div className="task-management__tabs">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            className={`task-management__tab${view === v.key ? ' task-management__tab--active' : ''}`}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="task-management__body">
        {status === 'loading' && (
          <div className="task-management__loading">
            <div className="spinner" />
            <p>טוען משימות...</p>
          </div>
        )}

        {status !== 'loading' && view === 'epics' && (
          <div className="task-management__epics">
            {epics.length === 0 ? (
              <div className="task-management__empty">
                <p>המשימות יוצרו אוטומטית אחרי שלב ה-Dev Planning (שלב 10).</p>
              </div>
            ) : (
              epics.map((epic, i) => (
                <EpicGroup key={i} epic={epic} projectId={projectId} />
              ))
            )}
          </div>
        )}

        {status !== 'loading' && view === 'sprints' && (
          <SprintBoard projectId={projectId} />
        )}
      </div>
    </div>
  );
}
