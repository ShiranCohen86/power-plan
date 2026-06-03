import { useState, useEffect, useRef } from 'react'; // useState still used for core state
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateProject } from '../store/slices/projectsSlice';
import { useLanguage } from '../context/LanguageContext.jsx';
import { PLANNING_PHASES } from '../utils/phaseConfig';
import { getPhaseDocument, getPipelineStatus } from '../api/pipeline.api';
import { getProject, getProjectSettings, getMeetings, getRequiredServices } from '../api/projects.api';
import { getAgentLogs } from '../api/agents.api';
import { getRateLimit } from '../api/settings.api';
import { usePanelResize } from './usePanelResize';
import { useApprovalScroll } from './useApprovalScroll';
import { usePhaseActions } from './usePhaseActions';
import { useWorkspaceSocket } from './useWorkspaceSocket';
import { useSocket } from '../context/SocketContext';
import { useDeploymentState } from './useDeploymentState';
import { useMeetingFeed } from './useMeetingFeed';
import { TOTAL_PLANNING_PHASES, MINUTES_PER_PHASE } from '../config/constants';
const INTRO_COMPLETE_DELAY_MS  = 700;
const INTRO_FAST_DELAY_MS      = 130;
const INTRO_SLOW_DELAY_MS      = 55;

function _buildMeetingMessages(meetingsRes) {
  const allMsgs = [];
  for (const m of meetingsRes) {
    const cfg = PLANNING_PHASES.find((p) => p.index === m.phaseIndex);
    allMsgs.push({ _isSeparator: true, phaseIndex: m.phaseIndex, label: cfg?.nameHe || `שלב ${m.phaseIndex}` });
    allMsgs.push(...m.messages);
  }
  return allMsgs;
}

export function useWorkspaceState(id) {
  const { t }      = useTranslation();
  const { lang }   = useLanguage();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { connected } = useSocket();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [project, setProject]                       = useState(null);
  const [phases, setPhases]                         = useState([]);
  const [activePhaseIndex, setActive]               = useState(null);
  const [activeDoc, setActiveDoc]                   = useState(null);
  const [awaitingPhase, setAwaiting]                = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState('');
  const [actionError, setActionError]               = useState('');
  const [quotaError, setQuotaError]                 = useState(null);
  const [hasApiKey, setHasApiKey]                   = useState(null);
  const [usingFallback, setUsingFallback]           = useState(false);
  const [rateLimit, setRateLimit]                   = useState(null);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [awaitingServices, setAwaitingServices]     = useState(null);

  // Deployment state — isolated in useDeploymentState
  const {
    deploySteps, setDeploySteps,
    liveUrl, setLiveUrl,
    liveGithubUrl, setLiveGithubUrl,
    deployFailed, setDeployFailed,
    showCelebration, setShowCelebration,
  } = useDeploymentState();

  // Meeting / feed state — isolated in useMeetingFeed
  const {
    meetingMsgs, setMeetingMsgs,
    techLogs, setTechLogs,
    activeFeedTab, setActiveFeedTab,
    scheduledMeeting, setScheduledMeeting,
    isMeetingLive, setIsMeetingLive,
    missedMeeting, setMissedMeeting,
    showMeetingRoom, setShowMeetingRoom,
    consultantMsgs, setConsultantMsgs,
    consultantsRunning, setConsultantsRunning,
  } = useMeetingFeed();

  // S129: presence viewers
  const [viewers, setViewers]                       = useState([]);

  // Phase intro animation
  const [introCount, setIntroCount]                 = useState(null);
  const introTargetRef                              = useRef(null);
  const hasFetchedRef                               = useRef(false);

  // ── Sub-hooks ────────────────────────────────────────────────────────────────
  const panels   = usePanelResize();
  const scroll   = useApprovalScroll(awaitingPhase);
  const actions  = usePhaseActions(id, {
    phases, setPhases, awaitingPhase, setAwaiting, setActionError,
    setProject, setHasApiKey, setRateLimit,
    hasApiKey, activePhaseIndex, activeDoc, project,
  });

  useWorkspaceSocket(id, {
    setPhases, setAwaiting, setActive, loadDocument,
    setProject, setDeploySteps, setLiveUrl, setLiveGithubUrl,
    setDeployFailed, setShowCelebration,
    setMeetingMsgs, setIsMeetingLive, setScheduledMeeting, setMissedMeeting,
    setQuotaError, setAwaitingServices,
    setTechLogs, setConsultantMsgs, setConsultantsRunning,
    activeFeedTab, setViewers,
  });

  // ── Document load ────────────────────────────────────────────────────────────
  async function loadDocument(phaseIndex) {
    try {
      const res = await getPhaseDocument(id, phaseIndex);
      setActiveDoc(res);
    } catch {
      setActiveDoc(null);
    }
  }

  // ── Initial data fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [projRes, statusRes, settingsRes, meetingsRes, rateLimitRes, logsRes] = await Promise.all([
          getProject(id),
          getPipelineStatus(id),
          getProjectSettings(id).catch(() => null),
          getMeetings(id).catch(() => []),
          getRateLimit().catch(() => null),
          getAgentLogs(id).catch(() => null),
        ]);

        if (projRes.status === 'onboarding') { navigate(`/new-project?resumeId=${id}`); return; }

        setProject(projRes);
        dispatch(updateProject(projRes));
        if (projRes.deployedUrl) setLiveUrl(projRes.deployedUrl);
        setPhases(statusRes.phases || []);

        const reached = (statusRes.phases || []).filter((p) => p.status !== 'pending');
        if (reached.length > 0) {
          introTargetRef.current = Math.max(...reached.map((p) => p.index)) + 1;
          setIntroCount(1);
        }

        setHasApiKey(settingsRes?.hasApiKey ?? false);
        setUsingFallback(settingsRes?.usingFallback || false);
        if (rateLimitRes) setRateLimit(rateLimitRes);
        if (logsRes?.items?.length) setTechLogs(logsRes.items);

        if (meetingsRes?.length) {
          setMeetingMsgs(_buildMeetingMessages(meetingsRes));
        }

        const waitingPhase = (statusRes.phases || []).find((p) => p.status === 'awaiting_approval');
        if (waitingPhase) {
          setAwaiting(waitingPhase.index);
          setActive(waitingPhase.index);
          loadDocument(waitingPhase.index);
        } else {
          // Auto-select the last completed phase so the doc is shown immediately
          const lastDone = (statusRes.phases || [])
            .filter((p) => p.status === 'completed')
            .sort((a, b) => b.index - a.index)[0];
          if (lastDone) {
            setActive(lastDone.index);
            loadDocument(lastDone.index);
          }
        }

        if (projRes.status === 'awaiting_credentials') {
          const svcRes = await getRequiredServices(id).catch(() => null);
          const pending = (svcRes?.services || []).filter((s) => !s.credentialsProvided && !s.skipped);
          if (pending.length > 0) setAwaitingServices(pending);
        }
      } catch {
        setError('שגיאה בטעינת הפרויקט');
      } finally {
        hasFetchedRef.current = true;
        setLoading(false);
      }
    })();
  // intentional: re-fetch only when project id changes, not on every state setter reference
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Reconnect resync ─────────────────────────────────────────────────────────
  // When the socket reconnects after a disconnect, events fired during the gap
  // are lost. Fetch fresh pipeline state so the UI reflects reality.
  useEffect(() => {
    if (!connected || !hasFetchedRef.current) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [statusRes, projRes] = await Promise.all([
          getPipelineStatus(id, controller.signal),
          getProject(id, controller.signal),
        ]);
        setProject(projRes);
        dispatch(updateProject(projRes));
        setPhases(statusRes.phases || []);

        const waitingPhase = (statusRes.phases || []).find((p) => p.status === 'awaiting_approval');
        if (waitingPhase) {
          setAwaiting(waitingPhase.index);
          setActive(waitingPhase.index);
          loadDocument(waitingPhase.index);
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          // non-critical — user can manually refresh
        }
      }
    })();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, id]);

  // ── Phase intro animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (introCount === null) return;
    const target = introTargetRef.current;
    if (introCount >= target) {
      const timer = setTimeout(() => setIntroCount(null), INTRO_COMPLETE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const delay = target - introCount <= 2 ? INTRO_FAST_DELAY_MS : INTRO_SLOW_DELAY_MS;
    const timer = setTimeout(() => setIntroCount((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [introCount]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const isDeploying     = project?.status === 'deploying' || Object.keys(deploySteps).length > 0;
  const isQuotaPaused   = project?.status === 'quota_paused' || !!quotaError;
  const hasPhases       = phases.length > 0;
  const isRunning       = phases.some((p) => p.status === 'running');
  const notStarted      = !hasPhases;
  const awaitPhase      = phases.find((p) => p.index === awaitingPhase);
  const projectStatus   = project?.status;
  const isOnboarding    = projectStatus === 'onboarding';
  const isPaused        = projectStatus === 'paused';
  const isFailed        = projectStatus === 'failed';
  const inProgress      = ['coding', 'deploying', 'live'].includes(projectStatus);
  const hasStalledPhase = phases.some((p) => p.status === 'failed' || p.status === 'interrupted');
  const isAwaitingCreds = projectStatus === 'awaiting_credentials';
  const canStart        = notStarted && !inProgress && !isQuotaPaused;
  const canResume       = (isPaused || isFailed || hasStalledPhase || isAwaitingCreds) && !isRunning && hasPhases && !isQuotaPaused;

  const completedCount  = phases.filter((p) => p.status === 'completed' || p.status === 'awaiting_approval').length;
  const totalTokensUsed = phases.reduce((s, p) => s + (p.tokensUsed || 0), 0);
  const remainingPhases = Math.max(0, TOTAL_PLANNING_PHASES - completedCount);
  const estMinutes      = Math.round(remainingPhases * MINUTES_PER_PHASE);
  const showEstTime     = isRunning && remainingPhases > 0;

  return {
    navigate, t, lang,
    // core
    project, setProject,
    phases, setPhases,
    activePhaseIndex, setActive,
    activeDoc, setActiveDoc,
    meetingMsgs, techLogs,
    awaitingPhase, setAwaiting,
    loading, error,
    actionError, setActionError,
    quotaError,
    deploySteps, liveUrl, liveGithubUrl, deployFailed,
    showCelebration, setShowCelebration,
    consultantMsgs, consultantsRunning,
    hasApiKey, setHasApiKey,
    usingFallback, rateLimit,
    showProjectSettings, setShowProjectSettings,
    awaitingServices, setAwaitingServices,
    introCount,
    activeFeedTab, setActiveFeedTab,
    scheduledMeeting,
    isMeetingLive,
    missedMeeting, setMissedMeeting,
    showMeetingRoom, setShowMeetingRoom,
    // from sub-hooks
    ...panels,
    ...scroll,
    // derived
    isDeploying, isQuotaPaused, hasPhases, isRunning, notStarted,
    awaitPhase, projectStatus, isOnboarding, isPaused, isFailed,
    inProgress, canStart, canResume,
    TOTAL_PLANNING: TOTAL_PLANNING_PHASES, completedCount, estMinutes, showEstTime, totalTokensUsed,
    viewers,                // S129
    // handlers
    loadDocument,
    ...actions,
  };
}
