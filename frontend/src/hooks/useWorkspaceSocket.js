import { useRef } from 'react';
import { PLANNING_PHASES } from '../utils/phaseConfig';
import { useProjectSocket } from './useProjectSocket';

function upsertPhase(phases, index, updates) {
  const existing = phases.find((p) => p.index === index);
  if (existing) return phases.map((p) => (p.index === index ? { ...p, ...updates } : p));
  return [...phases, { index, ...updates }].sort((a, b) => a.index - b.index);
}

export function useWorkspaceSocket(projectId, {
  setPhases,
  setAwaiting,
  setActive,
  loadDocument,
  setProject,
  setDeploySteps,
  setLiveUrl,
  setLiveGithubUrl,
  setDeployFailed,
  setShowCelebration,
  setMeetingMsgs,
  setIsMeetingLive,
  setScheduledMeeting,
  setMissedMeeting,
  setQuotaError,
  setAwaitingServices,
  setTechLogs,
  setConsultantMsgs,
  setConsultantsRunning,
  activeFeedTab,
}) {
  const wasWatchingRef    = useRef(false);
  const pageLoadTimeRef   = useRef(Date.now());
  const activeFeedTabRef  = useRef(activeFeedTab);
  activeFeedTabRef.current = activeFeedTab;

  useProjectSocket(projectId, {
    onPhaseRefining:   ({ phaseIndex }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running' }));
      setAwaiting(null);
    },
    onPhaseStarted:    ({ phaseIndex, agentName }) => {
      setActive(phaseIndex);
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running', agentName }));
    },
    onPhaseNarrative:  () => {},
    onPhaseCompleted:  ({ phaseIndex }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'awaiting_approval' }));
      loadDocument(phaseIndex);
    },
    onPhaseAwaiting:   ({ phaseIndex }) => {
      setAwaiting(phaseIndex);
      setActive(phaseIndex);
    },
    onPhaseApproved:   ({ phaseIndex }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'completed' }));
      setAwaiting((current) => current === phaseIndex ? null : current);
    },
    onPhaseFailed:     ({ phaseIndex, error: err }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'failed', errorMessage: err }));
      setProject((p) => p ? { ...p, status: 'failed' } : p);
    },
    onMeetingScheduled: ({ phaseIndex, scheduledAt }) => {
      setScheduledMeeting({ phaseIndex, scheduledAt: new Date(scheduledAt) });
    },
    onMeetingStarted:  ({ phaseIndex, phaseType, startedAt }) => {
      const loadedBeforeMeeting = startedAt && new Date(startedAt) > new Date(pageLoadTimeRef.current);
      wasWatchingRef.current = activeFeedTabRef.current === 'meeting' || !loadedBeforeMeeting;
      setScheduledMeeting(null);
      setIsMeetingLive(true);
      const cfg = PLANNING_PHASES.find((p) => p.type === phaseType || p.index === phaseIndex);
      setMeetingMsgs((prev) => [
        ...prev,
        { _isSeparator: true, phaseIndex, phaseType, label: cfg?.nameHe || phaseType },
      ]);
    },
    onMeetingMessage:  (msg) => setMeetingMsgs((prev) => [...prev, msg]),
    onMeetingCompleted: () => {
      setIsMeetingLive(false);
      if (!wasWatchingRef.current) setMissedMeeting(true);
      wasWatchingRef.current = false;
    },
    onPlanningComplete:  () => setProject((p) => p ? { ...p, completionPercent: 50 } : p),
    onQuotaExhausted:    ({ message }) => setQuotaError({ message }),
    onAwaitingCredentials: ({ services }) => setAwaitingServices(services),
    onDeploymentStep:    ({ step, status, label }) =>
      setDeploySteps((prev) => ({ ...prev, [step]: { status, label } })),
    onDeploymentCompleted: ({ url, githubUrl }) => {
      setLiveUrl(url);
      if (githubUrl) setLiveGithubUrl(githubUrl);
      setProject((p) => p ? { ...p, status: 'live', deployedUrl: url, completionPercent: 100 } : p);
    },
    onDeploymentFailed:  () => setDeployFailed(true),
    onCelebration:       () => setShowCelebration(true),
    onAgentLog:          (log) => setTechLogs((prev) => [...prev, log]),
    onFileWritten:       ({ filePath, language, lines }) =>
      setTechLogs((prev) => [...prev, {
        agentName: 'CodeGen', event: 'file_written',
        message: filePath, metadata: { language, lines }, timestamp: new Date(),
      }]),
    onSecretDetected:    ({ filePath }) =>
      setTechLogs((prev) => [...prev, {
        agentName: 'SecretScanner', event: 'error',
        message: `Secret detected in ${filePath} — file skipped`, timestamp: new Date(),
      }]),
    onCodegenComplete:       () => setProject((p) => p ? { ...p, completionPercent: 95 } : p),
    onConsultantsStarted:    () => { setConsultantsRunning(true); setConsultantMsgs([]); },
    onConsultantsMessage:    (msg) => setConsultantMsgs((prev) => [...prev, msg]),
    onConsultantsCompleted:  () => setConsultantsRunning(false),
  });
}
