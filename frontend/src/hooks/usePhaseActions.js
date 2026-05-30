import { toastSuccess } from '../utils/announce';
import { useTranslation } from 'react-i18next';
import { friendlyError } from '../utils/errorMessages';
import { analytics } from '../utils/analytics';
import {
  startPipeline, pausePipeline, approvePhase, refinePhase,
  retryPipeline, rollbackToPhase,
} from '../api/pipeline.api';
import { getRateLimit } from '../api/settings.api';

export function usePhaseActions(projectId, {
  phases,
  setPhases,
  awaitingPhase,
  setAwaiting,
  setActionError,
  setProject,
  setHasApiKey,
  setRateLimit,
  hasApiKey,
  activePhaseIndex,
  activeDoc,
  project,
}) {
  const { t } = useTranslation();

  function handleActionError(err) {
    const raw = err.message || '';
    const isKeyError = raw.includes('מפתח') || raw.includes('הגדרות') ||
                       raw.includes('credit') || raw.includes('קרדיט') ||
                       raw.includes('API key') || raw.includes('api key');
    if (isKeyError) setHasApiKey(false);
    else            setActionError(friendlyError(err));
  }

  async function handleStart() {
    if (hasApiKey === false) return;
    try {
      await startPipeline(projectId);
      setActionError('');
      toastSuccess('הפייפליין התחיל!');
      analytics.pipelineStarted(projectId);
      getRateLimit().then(setRateLimit).catch(() => {}); // non-fatal — rate limit display is best-effort
    } catch (err) { handleActionError(err); }
  }

  async function handleRetry() {
    try {
      await retryPipeline(projectId);
      setActionError('');
      toastSuccess('מנסה שוב מהשלב שנכשל...');
      getRateLimit().then(setRateLimit).catch(() => {}); // non-fatal — rate limit display is best-effort
    } catch (err) { handleActionError(err); }
  }

  async function handlePause() {
    try {
      await pausePipeline(projectId);
      setProject((p) => p ? { ...p, status: 'paused' } : p);
      toastSuccess('הפייפליין הופסק');
    } catch (err) { handleActionError(err); }
  }

  async function handleApprove() {
    if (awaitingPhase == null) return;
    try {
      await approvePhase(projectId, awaitingPhase);
      setAwaiting(null);
      setActionError('');
      toastSuccess('השלב אושר — ממשיך לשלב הבא');
      analytics.phaseApproved(projectId, awaitingPhase);
    } catch (err) { handleActionError(err); }
  }

  async function handleRollback(toPhaseIndex) {
    try {
      await rollbackToPhase(projectId, toPhaseIndex);
      setPhases((prev) =>
        prev.map((p) => p.index >= toPhaseIndex ? { ...p, status: 'pending', output: null } : p),
      );
      setProject((p) => p ? { ...p, status: 'planning', currentPhaseIndex: toPhaseIndex } : p);
      setAwaiting(null);
      setActionError('');
      toastSuccess(`חזרנו לשלב ${toPhaseIndex + 1}`);
    } catch (err) { handleActionError(err); }
  }

  async function handleRefine(feedback) {
    if (!feedback?.trim() || awaitingPhase == null) return;
    try {
      await refinePhase(projectId, awaitingPhase, feedback);
      setActionError('');
      toastSuccess('בקשת התיקון נשלחה — Claude מעדכן...');
    } catch (err) {
      handleActionError(err);
      throw err;
    }
  }

  return {
    handleStart, handleRetry, handlePause,
    handleApprove, handleRollback, handleRefine,
  };
}
