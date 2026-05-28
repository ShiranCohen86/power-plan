import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateProject } from '../store/slices/projectsSlice';
import toast from 'react-hot-toast';
import { PLANNING_PHASES } from '../utils/phaseConfig';
import { friendlyError } from '../utils/errorMessages';
import { analytics } from '../utils/analytics';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useProjectSocket } from './useProjectSocket';
import {
  startPipeline, pausePipeline, approvePhase, refinePhase,
  getPipelineStatus, getPhaseDocument, retryPipeline, rollbackToPhase,
} from '../api/pipeline.api';
import {
  getProject, getProjectSettings, getMeetings, getRequiredServices,
} from '../api/projects.api';
import { getAgentLogs } from '../api/agents.api';
import { getRateLimit } from '../api/settings.api';

function upsertPhase(phases, index, updates) {
  const existing = phases.find((p) => p.index === index);
  if (existing) return phases.map((p) => (p.index === index ? { ...p, ...updates } : p));
  return [...phases, { index, ...updates }].sort((a, b) => a.index - b.index);
}

export function useWorkspaceState(id) {
  const { t }      = useTranslation();
  const { lang }   = useLanguage();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();

  // ── State ──────────────────────────────────────────────────────────────────
  const [project, setProject]           = useState(null);
  const [phases, setPhases]             = useState([]);
  const [activePhaseIndex, setActive]   = useState(null);
  const [activeDoc, setActiveDoc]       = useState(null);
  const [meetingMsgs, setMeetingMsgs]   = useState([]);
  const [techLogs, setTechLogs]         = useState([]);
  const [awaitingPhase, setAwaiting]    = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [actionError, setActionError]   = useState('');
  const [quotaError, setQuotaError]     = useState(null);
  const [deploySteps, setDeploySteps]   = useState({});
  const [liveUrl, setLiveUrl]           = useState(null);
  const [liveGithubUrl, setLiveGithubUrl] = useState(null);
  const [deployFailed, setDeployFailed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [consultantMsgs, setConsultantMsgs] = useState([]);
  const [consultantsRunning, setConsultantsRunning] = useState(false);
  const [hasApiKey, setHasApiKey]       = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [rateLimit, setRateLimit]       = useState(null);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [awaitingServices, setAwaitingServices] = useState(null);
  const [introCount, setIntroCount]     = useState(null);
  const introTargetRef                  = useRef(null);

  const [activeFeedTab, setActiveFeedTab]       = useState('meeting');
  const [scheduledMeeting, setScheduledMeeting] = useState(null);
  const [isMeetingLive, setIsMeetingLive]       = useState(false);
  const [missedMeeting, setMissedMeeting]       = useState(false);
  const [showMeetingRoom, setShowMeetingRoom]   = useState(false);
  const wasWatchingRef                          = useRef(false);
  const pageLoadTimeRef                         = useRef(Date.now());

  const mainRef                                 = useRef(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const sidebarRef     = useRef(null);
  const feedWrapperRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    Math.max(160, Math.min(400, parseInt(localStorage.getItem('ws-sidebar-w'), 10) || 240))
  );
  const [feedWidth, setFeedWidth] = useState(() =>
    Math.max(200, Math.min(480, parseInt(localStorage.getItem('ws-feed-w'), 10) || 280))
  );

  // ── Panel resize ───────────────────────────────────────────────────────────
  function startResize(e, which) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = which === 'sidebar'
      ? sidebarRef.current.offsetWidth
      : feedWrapperRef.current.offsetWidth;

    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      const delta = ev.clientX - startX;
      if (which === 'sidebar') {
        const w = Math.max(160, Math.min(400, startW - delta));
        sidebarRef.current.style.width = w + 'px';
      } else {
        const w = Math.max(200, Math.min(480, startW + delta));
        feedWrapperRef.current.style.width = w + 'px';
      }
    }

    function onUp() {
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const finalW = which === 'sidebar'
        ? sidebarRef.current.offsetWidth
        : feedWrapperRef.current.offsetWidth;
      if (which === 'sidebar') { setSidebarWidth(finalW); localStorage.setItem('ws-sidebar-w', finalW); }
      else                     { setFeedWidth(finalW);    localStorage.setItem('ws-feed-w', finalW); }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadDocument(phaseIndex) {
    try {
      const res = await getPhaseDocument(id, phaseIndex);
      setActiveDoc(res);
    } catch {
      setActiveDoc(null);
      toast.error('לא ניתן לטעון את מסמך השלב — נסה שוב');
    }
  }

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
        dispatch(updateProject(projRes)); // sync to Redux so AppShell can read the title
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

        const waiting = (statusRes.phases || []).find((p) => p.status === 'awaiting_approval');
        if (waiting) { setAwaiting(waiting.index); setActive(waiting.index); loadDocument(waiting.index); }

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

  // Phase intro animation
  useEffect(() => {
    if (introCount === null) return;
    const target = introTargetRef.current;
    if (introCount >= target) {
      const t = setTimeout(() => setIntroCount(null), 700);
      return () => clearTimeout(t);
    }
    const delay = target - introCount <= 2 ? 130 : 55;
    const t = setTimeout(() => setIntroCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [introCount]);

  // Reset scroll-gate when a new phase awaits approval
  useEffect(() => { setHasScrolledToBottom(false); }, [awaitingPhase]);

  // Scroll detection for approval unlock
  useEffect(() => {
    const el = mainRef.current;
    if (!el || awaitingPhase === null) return;
    const check = () => setHasScrolledToBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [awaitingPhase]);

  // ── WebSocket events ───────────────────────────────────────────────────────
  useProjectSocket(id, {
    onPhaseRefining:   ({ phaseIndex }) => { setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running' })); setAwaiting(null); },
    onPhaseStarted:    ({ phaseIndex, agentName }) => { setActive(phaseIndex); setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running', agentName })); },
    onPhaseNarrative:  () => {},
    onPhaseCompleted:  ({ phaseIndex }) => { setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'awaiting_approval' })); loadDocument(phaseIndex); },
    onPhaseAwaiting:   ({ phaseIndex }) => { setAwaiting(phaseIndex); setActive(phaseIndex); },
    onPhaseApproved:   ({ phaseIndex }) => { setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'completed' })); setAwaiting((a) => a === phaseIndex ? null : a); },
    onPhaseFailed:     ({ phaseIndex, error: err }) => { setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'failed', errorMessage: err })); setProject((p) => p ? { ...p, status: 'failed' } : p); },
    onMeetingScheduled: ({ phaseIndex, scheduledAt }) => { setScheduledMeeting({ phaseIndex, scheduledAt: new Date(scheduledAt) }); },
    onMeetingStarted:  ({ phaseIndex, phaseType, startedAt }) => {
      const loadedBeforeMeeting = startedAt && new Date(startedAt) > new Date(pageLoadTimeRef.current);
      wasWatchingRef.current = activeFeedTab === 'meeting' || !loadedBeforeMeeting;
      setScheduledMeeting(null);
      setIsMeetingLive(true);
      const cfg = PLANNING_PHASES.find((p) => p.type === phaseType || p.index === phaseIndex);
      setMeetingMsgs((prev) => [...prev, { _isSeparator: true, phaseIndex, phaseType, label: cfg?.nameHe || phaseType }]);
    },
    onMeetingMessage:  (msg) => setMeetingMsgs((prev) => [...prev, msg]),
    onMeetingCompleted: () => { setIsMeetingLive(false); if (!wasWatchingRef.current) setMissedMeeting(true); wasWatchingRef.current = false; },
    onPlanningComplete: () => setProject((p) => p ? { ...p, completionPercent: 50 } : p),
    onQuotaExhausted:  ({ message }) => setQuotaError({ message }),
    onAwaitingCredentials: ({ services }) => setAwaitingServices(services),
    onDeploymentStep:  ({ step, status, label }) => setDeploySteps((prev) => ({ ...prev, [step]: { status, label } })),
    onDeploymentCompleted: ({ url, githubUrl }) => {
      setLiveUrl(url);
      if (githubUrl) setLiveGithubUrl(githubUrl);
      setProject((p) => p ? { ...p, status: 'live', deployedUrl: url, completionPercent: 100 } : p);
    },
    onDeploymentFailed: () => setDeployFailed(true),
    onCelebration:     () => setShowCelebration(true),
    onAgentLog:        (log) => setTechLogs((prev) => [...prev, log]),
    onFileWritten:     ({ filePath, language, lines }) => setTechLogs((prev) => [...prev, { agentName: 'CodeGen', event: 'file_written', message: filePath, metadata: { language, lines }, timestamp: new Date() }]),
    onSecretDetected:  ({ filePath }) => setTechLogs((prev) => [...prev, { agentName: 'SecretScanner', event: 'error', message: `Secret detected in ${filePath} — file skipped`, timestamp: new Date() }]),
    onCodegenComplete: () => setProject((p) => p ? { ...p, completionPercent: 95 } : p),
    onConsultantsStarted:   () => { setConsultantsRunning(true); setConsultantMsgs([]); },
    onConsultantsMessage:   (msg) => setConsultantMsgs((prev) => [...prev, msg]),
    onConsultantsCompleted: () => setConsultantsRunning(false),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleActionError(err) {
    const raw = err.message || '';
    const isKeyErr = raw.includes('מפתח') || raw.includes('הגדרות') ||
                     raw.includes('credit') || raw.includes('קרדיט') ||
                     raw.includes('API key') || raw.includes('api key');
    if (isKeyErr) setHasApiKey(false);
    else          setActionError(friendlyError(err));
  }

  async function handleStart() {
    if (hasApiKey === false) return;
    try {
      await startPipeline(id);
      setActionError('');
      toast.success('הפייפליין התחיל!');
      analytics.pipelineStarted(id);
      getRateLimit().then(setRateLimit).catch(() => {});
    } catch (err) { handleActionError(err); }
  }

  async function handleRetry() {
    try {
      await retryPipeline(id);
      setActionError('');
      toast.success('מנסה שוב מהשלב שנכשל...');
      getRateLimit().then(setRateLimit).catch(() => {});
    } catch (err) { handleActionError(err); }
  }

  async function handlePause() {
    try {
      await pausePipeline(id);
      setProject((p) => p ? { ...p, status: 'paused' } : p);
      toast.success('הפייפליין הופסק');
    } catch (err) { handleActionError(err); }
  }

  async function handleApprove() {
    if (awaitingPhase == null) return;
    try {
      await approvePhase(id, awaitingPhase);
      setAwaiting(null);
      setActionError('');
      toast.success('השלב אושר — ממשיך לשלב הבא');
      analytics.phaseApproved(id, awaitingPhase);
    } catch (err) { handleActionError(err); }
  }

  async function handleRollback(toPhaseIndex) {
    try {
      await rollbackToPhase(id, toPhaseIndex);
      setPhases((prev) => prev.map((p) => p.index >= toPhaseIndex ? { ...p, status: 'pending', output: null } : p));
      setProject((p) => p ? { ...p, status: 'planning', currentPhaseIndex: toPhaseIndex } : p);
      setAwaiting(null);
      setActionError('');
      toast.success(`חזרנו לשלב ${toPhaseIndex + 1}`);
    } catch (err) { handleActionError(err); }
  }

  async function handleRefine(feedback) {
    if (!feedback?.trim() || awaitingPhase == null) return;
    try {
      await refinePhase(id, awaitingPhase, feedback);
      setActionError('');
      toast.success('בקשת התיקון נשלחה — Claude מעדכן...');
    } catch (err) {
      handleActionError(err);
      throw err;
    }
  }

  function handleExportDoc() {
    if (!activeDoc?.content) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${project?.title || 'phase'}-${activePhaseIndex}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const isDeploying        = project?.status === 'deploying' || Object.keys(deploySteps).length > 0;
  const isQuotaPaused      = project?.status === 'quota_paused' || quotaError;
  const hasPhases          = phases.length > 0;
  const isRunning          = phases.some((p) => p.status === 'running');
  const notStarted         = !hasPhases;
  const awaitPhase         = phases.find((p) => p.index === awaitingPhase);
  const projectStatus      = project?.status;
  const isOnboarding       = projectStatus === 'onboarding';
  const isPaused           = projectStatus === 'paused';
  const isFailed           = projectStatus === 'failed';
  const inProgress         = ['coding', 'deploying', 'live'].includes(projectStatus);
  const hasStalledPhase    = phases.some((p) => p.status === 'failed' || p.status === 'interrupted');
  const canStart           = notStarted && !inProgress && !isQuotaPaused;
  const isAwaitingCreds    = projectStatus === 'awaiting_credentials';
  const canResume          = (isPaused || isFailed || hasStalledPhase || isAwaitingCreds) && !isRunning && hasPhases && !isQuotaPaused;

  const TOTAL_PLANNING     = 12;
  const completedCount     = phases.filter((p) => p.status === 'completed' || p.status === 'awaiting_approval').length;
  const remainingPhases    = Math.max(0, TOTAL_PLANNING - completedCount);
  const estMinutes         = Math.round(remainingPhases * 2.5);
  const showEstTime        = isRunning && remainingPhases > 0;

  return {
    // routing / i18n
    navigate, t, lang,
    // state
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
    usingFallback,
    rateLimit,
    showProjectSettings, setShowProjectSettings,
    awaitingServices, setAwaitingServices,
    introCount,
    activeFeedTab, setActiveFeedTab,
    scheduledMeeting,
    isMeetingLive,
    missedMeeting, setMissedMeeting,
    showMeetingRoom, setShowMeetingRoom,
    hasScrolledToBottom,
    // refs
    mainRef, sidebarRef, feedWrapperRef,
    // panel sizing
    sidebarWidth, feedWidth,
    // derived
    isDeploying, isQuotaPaused, hasPhases, isRunning, notStarted,
    awaitPhase, projectStatus, isOnboarding, isPaused, isFailed,
    inProgress, canStart, canResume,
    TOTAL_PLANNING, completedCount, estMinutes, showEstTime,
    // handlers
    startResize, loadDocument,
    handleStart, handleRetry, handlePause,
    handleApprove, handleRollback, handleRefine, handleExportDoc,
  };
}
