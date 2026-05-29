import { useState, useEffect, useRef } from 'react';
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
import { TOTAL_PLANNING_PHASES } from '../config/constants';

export function useWorkspaceState(id) {
  const { t }      = useTranslation();
  const { lang }   = useLanguage();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();

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

  // Deployment state
  const [deploySteps, setDeploySteps]               = useState({});
  const [liveUrl, setLiveUrl]                       = useState(null);
  const [liveGithubUrl, setLiveGithubUrl]           = useState(null);
  const [deployFailed, setDeployFailed]             = useState(false);
  const [showCelebration, setShowCelebration]       = useState(false);

  // Meeting / feed state
  const [meetingMsgs, setMeetingMsgs]               = useState([]);
  const [techLogs, setTechLogs]                     = useState([]);
  const [activeFeedTab, setActiveFeedTab]           = useState('meeting');
  const [scheduledMeeting, setScheduledMeeting]     = useState(null);
  const [isMeetingLive, setIsMeetingLive]           = useState(false);
  const [missedMeeting, setMissedMeeting]           = useState(false);
  const [showMeetingRoom, setShowMeetingRoom]       = useState(false);
  const [consultantMsgs, setConsultantMsgs]         = useState([]);
  const [consultantsRunning, setConsultantsRunning] = useState(false);

  // Phase intro animation
  const [introCount, setIntroCount]                 = useState(null);
  const introTargetRef                              = useRef(null);

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
    activeFeedTab,
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
          const allMsgs = [];
          for (const m of meetingsRes) {
            const cfg = PLANNING_PHASES.find((p) => p.index === m.phaseIndex);
            allMsgs.push({ _isSeparator: true, phaseIndex: m.phaseIndex, label: cfg?.nameHe || `שלב ${m.phaseIndex}` });
            allMsgs.push(...m.messages);
          }
          setMeetingMsgs(allMsgs);
        }

        const waitingPhase = (statusRes.phases || []).find((p) => p.status === 'awaiting_approval');
        if (waitingPhase) {
          setAwaiting(waitingPhase.index);
          setActive(waitingPhase.index);
          loadDocument(waitingPhase.index);
        }

        if (projRes.status === 'awaiting_credentials') {
          const svcRes = await getRequiredServices(id).catch(() => null);
          const pending = (svcRes?.services || []).filter((s) => !s.credentialsProvided && !s.skipped);
          if (pending.length > 0) setAwaitingServices(pending);
        }
      } catch {
        setError('שגיאה בטעינת הפרויקט');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Phase intro animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (introCount === null) return;
    const target = introTargetRef.current;
    if (introCount >= target) {
      const timer = setTimeout(() => setIntroCount(null), 700);
      return () => clearTimeout(timer);
    }
    const delay = target - introCount <= 2 ? 130 : 55;
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
  const remainingPhases = Math.max(0, TOTAL_PLANNING_PHASES - completedCount);
  const estMinutes      = Math.round(remainingPhases * 2.5);
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
    TOTAL_PLANNING: TOTAL_PLANNING_PHASES, completedCount, estMinutes, showEstTime,
    // handlers
    loadDocument,
    ...actions,
  };
}
