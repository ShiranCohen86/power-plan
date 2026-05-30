import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { toastSuccess, toastError } from '../utils/announce';
import { fetchEpicTree, selectEpicTree, selectTasksStatus } from '../store/slices/tasksSlice';
import { fetchSprints } from '../store/slices/sprintsSlice';
import { selectProjectById } from '../store/slices/projectsSlice';
import { triggerExtract } from '../api/tasks.api';
import EpicGroup from '../components/tasks/EpicGroup';
import SprintBoard from '../components/tasks/SprintBoard';
import { useProjectSocket } from '../hooks/useProjectSocket';

export default function TaskManagement() {
  const { t } = useTranslation();
  const { id: projectId } = useParams();
  const dispatch           = useDispatch();
  const project            = useSelector(selectProjectById(projectId));
  const epics              = useSelector(selectEpicTree(projectId));
  const status             = useSelector(selectTasksStatus);
  const [view, setView]      = useState('epics');
  const [extracting, setExtracting] = useState(false);

  async function handleExtract() {
    setExtracting(true);
    try {
      await triggerExtract(projectId);
      toastSuccess(t('tasks.extractStarted'));
    } catch (err) {
      toastError(err.message || t('tasks.extractError'));
      setExtracting(false);
    }
  }

  useEffect(() => {
    dispatch(fetchEpicTree(projectId));
  }, [dispatch, projectId]);

  useProjectSocket(projectId, {
    onTasksExtracted: () => {
      dispatch(fetchEpicTree(projectId));
      dispatch(fetchSprints(projectId));
    },
  });

  const totalTasks = useMemo(
    () => epics.reduce((sum, e) => sum + (e.features || []).reduce((s, f) => s + (f.tasks || []).length, 0), 0),
    [epics],
  );
  const doneTasks = useMemo(
    () => epics.reduce(
      (sum, e) => sum + (e.features || []).reduce(
        (s, f) => s + (f.tasks || []).filter((t) => t.status === 'deployed').length, 0,
      ), 0,
    ),
    [epics],
  );

  const VIEWS = [
    { key: 'epics',   label: t('tasks.tabEpics') },
    { key: 'sprints', label: t('tasks.tabSprints') },
  ];

  return (
    <div className="task-management">
      <div className="task-management__header">
        <div className="task-management__back-wrap">
          <Link to={`/projects/${projectId}/workspace`} className="task-management__back-btn">
            ← {t('tasks.backToProject')}
          </Link>
        </div>
        <div className="task-management__title">
          {project?.title || t('tasks.title')}
        </div>
        <div className="task-management__stats">
          <span className="task-management__stat">
            <strong>{totalTasks}</strong> {t('tasks.title')}
          </span>
          <span className="task-management__stat">
            <strong>{doneTasks}</strong> {t('tasks.completed')}
          </span>
          <span className="task-management__stat">
            <strong>{epics.length}</strong> {t('tasks.epics')}
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
            <p>{t('tasks.loading')}</p>
          </div>
        )}

        {status !== 'loading' && view === 'epics' && (
          <div className="task-management__epics">
            {epics.length === 0 ? (
              (() => {
                const notReady = project && ['onboarding', 'planning'].includes(project.status);
                return notReady ? (
                  <div className="task-management__empty">
                    <p>{t('tasks.emptyNotReady')}</p>
                    <Link
                      to={`/projects/${projectId}/workspace`}
                      className="btn btn--primary task-management__extract-btn"
                    >
                      {t('tasks.goToWorkspace')}
                    </Link>
                  </div>
                ) : (
                  <div className="task-management__empty">
                    <p>{t('tasks.empty')}</p>
                    <button
                      className="btn btn--primary task-management__extract-btn"
                      onClick={handleExtract}
                      disabled={extracting}
                    >
                      {extracting ? t('tasks.extracting') : t('tasks.extractBtn')}
                    </button>
                  </div>
                );
              })()
            ) : (
              epics.map((epic) => (
                <EpicGroup key={epic.title} epic={epic} projectId={projectId} />
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
