import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SafeMarkdown from '../components/ui/SafeMarkdown';
import { PLANNING_PHASES, PHASE_LEAD, ALL_PHASES } from '../utils/phaseConfig';
import { useLanguage } from '../context/LanguageContext.jsx';

import { selectProjectById, updateProject } from '../store/slices/projectsSlice';
import { useProjectSocket } from '../hooks/useProjectSocket';
import {
  startPipeline, pausePipeline, approvePhase, refinePhase,
  getPipelineStatus, getPhaseDocument,
} from '../api/pipeline.api';
import { getProject, getProjectSettings, getMeetings, getRequiredServices } from '../api/projects.api';
import { getAgentLogs } from '../api/agents.api';
import { getRateLimit } from '../api/settings.api';

import PhaseList                    from '../components/workspace/PhaseList';
import LiveFeed                     from '../components/workspace/LiveFeed';
import WorkspaceApprovalFooter      from '../components/workspace/WorkspaceApprovalFooter';
import MeetingRoomOverlay           from '../components/workspace/MeetingRoomOverlay';
import ProjectSettingsModal         from '../components/workspace/ProjectSettingsModal';
import CredentialsGateModal         from '../components/workspace/CredentialsGateModal';
import QuotaBanner                  from '../components/workspace/QuotaBanner';
import DeploymentStatus             from '../components/workspace/DeploymentStatus';
import CelebrationOverlay           from '../components/workspace/CelebrationOverlay';
import SettingsGate                 from '../components/SettingsGate';

const STATUS_LABEL = {
  pending:            '⏳',
  running:            '🔄',
  completed:          '✅',
  failed:             '❌',
  awaiting_approval:  '💛',
  interrupted:        '⏸️',
};

export default function ProjectWorkspace() {
  const { id }     = useParams();
  const { t }      = useTranslation();
  const { lang }   = useLanguage();
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const [project, setProject]           = useState(null);
  const [phases, setPhases]             = useState([]);
  const [activePhaseIndex, setActive]   = useState(null);
  const [activeDoc, setActiveDoc]       = useState(null);
  const [meetingMsgs, setMeetingMsgs]   = useState([]);
  const [techLogs, setTechLogs]         = useState([]);
  const [awaitingPhase, setAwaiting]    = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');       // fatal load error → full page
  const [actionError, setActionError]   = useState('');       // kept for legacy inline banner; new errors use toast
  const [quotaError, setQuotaError]     = useState(null);   // { message, plan }
  const [deploySteps, setDeploySteps]   = useState({});     // { [key]: { status, label } }
  const [liveUrl, setLiveUrl]           = useState(null);
  const [liveGithubUrl, setLiveGithubUrl] = useState(null);
  const [deployFailed, setDeployFailed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [consultantMsgs, setConsultantMsgs] = useState([]);
  const [consultantsRunning, setConsultantsRunning] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(null); // null = loading
  const [usingFallback, setUsingFallback] = useState(false);
  const [rateLimit, setRateLimit] = useState(null); // { used, remaining, maxPerHour, resetsAt }
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [awaitingServices, setAwaitingServices]       = useState(null); // null | [{ id, name, fields, howto }]

  // Live Company Experience state
  const [activeFeedTab, setActiveFeedTab]       = useState('meeting');
  const [scheduledMeeting, setScheduledMeeting] = useState(null); // { phaseIndex, scheduledAt }
  const [isMeetingLive, setIsMeetingLive]       = useState(false);
  const [missedMeeting, setMissedMeeting]       = useState(false);
  const [showMeetingRoom, setShowMeetingRoom]   = useState(false);
  const wasWatchingRef                           = useRef(false);
  const pageLoadTimeRef                          = useRef(Date.now());

  // Approval footer scroll-gate
  const mainRef                                  = useRef(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Resizable panels
  const sidebarRef     = useRef(null);
  const feedWrapperRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    Math.max(160, Math.min(400, parseInt(localStorage.getItem('ws-sidebar-w'), 10) || 240))
  );
  const [feedWidth, setFeedWidth] = useState(() =>
    Math.max(200, Math.min(480, parseInt(localStorage.getItem('ws-feed-w'), 10) || 280))
  );

  function startResize(e, which) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = which === 'sidebar'
      ? sidebarRef.current.offsetWidth
      : feedWrapperRef.current.offsetWidth;

    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      const delta = ev.clientX - startX;
      if (which === 'sidebar') {
        // In RTL: sidebar is on the right. Right handle → drag right = smaller sidebar.
        const w = Math.max(160, Math.min(400, startW - delta));
        sidebarRef.current.style.width = w + 'px';
      } else {
        // Feed is on the left. Left handle → drag right = bigger feed.
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
      if (which === 'sidebar') {
        setSidebarWidth(finalW);
        localStorage.setItem('ws-sidebar-w', finalW);
      } else {
        setFeedWidth(finalW);
        localStorage.setItem('ws-feed-w', finalW);
      }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Load project + pipeline status + historical meetings
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

        // Onboarding projects have no workspace yet — redirect to discovery flow
        if (projRes.status === 'onboarding') {
          navigate(`/new-project?resumeId=${id}`);
          return;
        }

        setProject(projRes);
        setPhases(statusRes.phases || []);
        setHasApiKey(settingsRes?.hasApiKey ?? false);
        setUsingFallback(settingsRes?.usingFallback || false);
        if (rateLimitRes) setRateLimit(rateLimitRes);
        if (logsRes?.items?.length) setTechLogs(logsRes.items);

        // Pre-populate meeting tab with historical messages, injecting phase separators
        if (meetingsRes?.length) {
          const allMsgs = [];
          for (const m of meetingsRes) {
            const cfg = PLANNING_PHASES.find((p) => p.index === m.phaseIndex);
            allMsgs.push({ _isSeparator: true, phaseIndex: m.phaseIndex, label: cfg?.nameHe || `שלב ${m.phaseIndex}` });
            allMsgs.push(...m.messages);
          }
          setMeetingMsgs(allMsgs);
        }

        // If there's a phase awaiting approval, set it
        const waiting = (statusRes.phases || []).find((p) => p.status === 'awaiting_approval');
        if (waiting) {
          setAwaiting(waiting.index);
          setActive(waiting.index);
          loadDocument(waiting.index);
        }

        // Rehydrate credentials modal after page refresh
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
  }, [id]);

  // Reset scroll-gate when a new phase awaits approval
  useEffect(() => {
    setHasScrolledToBottom(false);
  }, [awaitingPhase]);

  // Scroll detection on workspace-main
  useEffect(() => {
    const el = mainRef.current;
    if (!el || awaitingPhase === null) return;
    const check = () =>
      setHasScrolledToBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 50);
    check(); // handles short documents that don't require scrolling
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [awaitingPhase]);

  async function loadDocument(phaseIndex) {
    try {
      const res = await getPhaseDocument(id, phaseIndex);
      setActiveDoc(res);
    } catch {
      setActiveDoc(null);
      toast.error('לא ניתן לטעון את מסמך השלב — נסה שוב');
    }
  }

  // WebSocket event handlers
  useProjectSocket(id, {
    onPhaseRefining: ({ phaseIndex }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running' }));
      setAwaiting(null);
    },
    onPhaseStarted: ({ phaseIndex, agentName }) => {
      setActive(phaseIndex);
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running', agentName }));
    },
    onPhaseNarrative: () => {},
    onPhaseCompleted: ({ phaseIndex }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'awaiting_approval' }));
      loadDocument(phaseIndex);
    },
    onPhaseAwaiting: ({ phaseIndex }) => {
      setAwaiting(phaseIndex);
      setActive(phaseIndex);
    },
    onPhaseApproved: ({ phaseIndex }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'completed' }));
      if (awaitingPhase === phaseIndex) setAwaiting(null);
    },
    onPhaseFailed: ({ phaseIndex, error: err }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'failed', errorMessage: err }));
      setProject((p) => p ? { ...p, status: 'failed' } : p);
    },
    onMeetingScheduled: ({ phaseIndex, scheduledAt }) => {
      setScheduledMeeting({ phaseIndex, scheduledAt: new Date(scheduledAt) });
    },
    onMeetingStarted: ({ phaseIndex, phaseType, startedAt }) => {
      // Detect if user was watching: on meeting tab, or page loaded before meeting started
      const loadedBeforeMeeting = startedAt && new Date(startedAt) > new Date(pageLoadTimeRef.current);
      wasWatchingRef.current = activeFeedTab === 'meeting' || !loadedBeforeMeeting;
      setScheduledMeeting(null);
      setIsMeetingLive(true);
      const cfg = PLANNING_PHASES.find((p) => p.type === phaseType || p.index === phaseIndex);
      setMeetingMsgs((prev) => [
        ...prev,
        { _isSeparator: true, phaseIndex, phaseType, label: cfg?.nameHe || phaseType },
      ]);
    },
    onMeetingMessage: (msg) => {
      setMeetingMsgs((prev) => [...prev, msg]);
    },
    onMeetingCompleted: () => {
      setIsMeetingLive(false);
      if (!wasWatchingRef.current) setMissedMeeting(true);
      wasWatchingRef.current = false;
    },
    onPlanningComplete: () => {
      setProject((p) => p ? { ...p, completionPercent: 50 } : p);
    },
    onQuotaExhausted: ({ message }) => {
      setQuotaError({ message });
    },
    onAwaitingCredentials: ({ services }) => {
      setAwaitingServices(services);
    },
    onDeploymentStep: ({ step, status, label }) => {
      setDeploySteps((prev) => ({ ...prev, [step]: { status, label } }));
    },
    onDeploymentCompleted: ({ url, githubUrl }) => {
      setLiveUrl(url);
      if (githubUrl) setLiveGithubUrl(githubUrl);
      setProject((p) => p ? { ...p, status: 'live', deployedUrl: url, completionPercent: 100 } : p);
    },
    onDeploymentFailed: () => {
      setDeployFailed(true);
    },
    onCelebration: () => {
      setShowCelebration(true);
    },
    onAgentLog: (log) => {
      setTechLogs((prev) => [...prev, log]);
    },
    onFileWritten: ({ filePath, language, lines, phaseIndex }) => {
      setTechLogs((prev) => [...prev, {
        agentName: 'CodeGen',
        event:     'file_written',
        message:   filePath,
        metadata:  { language, lines },
        timestamp: new Date(),
      }]);
    },
    onSecretDetected: ({ filePath }) => {
      setTechLogs((prev) => [...prev, {
        agentName: 'SecretScanner',
        event:     'error',
        message:   `Secret detected in ${filePath} — file skipped`,
        timestamp: new Date(),
      }]);
    },
    onCodegenComplete: () => {
      setProject((p) => p ? { ...p, completionPercent: 95 } : p);
    },
    onConsultantsStarted: () => {
      setConsultantsRunning(true);
      setConsultantMsgs([]);
    },
    onConsultantsMessage: (msg) => {
      setConsultantMsgs((prev) => [...prev, msg]);
    },
    onConsultantsCompleted: ({ improvementsCount }) => {
      setConsultantsRunning(false);
    },
  });

  function handleActionError(err) {
    const msg = err.message || '';
    const isKeyErr = msg.includes('מפתח') || msg.includes('הגדרות') ||
                     msg.includes('credit') || msg.includes('קרדיט') ||
                     msg.includes('API key') || msg.includes('api key');
    if (isKeyErr) {
      setHasApiKey(false); // surface the inline SettingsGate
    } else {
      toast.error(msg || 'שגיאה — נסה שוב');
    }
  }

  async function handleStart() {
    if (hasApiKey === false) return;
    try {
      await startPipeline(id);
      toast.success('הפייפליין התחיל!');
      // Refresh rate limit counter after a successful start
      getRateLimit().then(setRateLimit).catch(() => {});
    } catch (err) {
      handleActionError(err);
    }
  }

  async function handlePause() {
    try {
      await pausePipeline(id);
      setProject((p) => p ? { ...p, status: 'paused' } : p);
      toast.success('הפייפליין הופסק');
    } catch (err) {
      handleActionError(err);
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

  async function handleApprove() {
    if (awaitingPhase == null) return;
    try {
      await approvePhase(id, awaitingPhase);
      setAwaiting(null);
      toast.success('השלב אושר — ממשיך לשלב הבא');
    } catch (err) {
      handleActionError(err);
    }
  }

  async function handleRefine(feedback) {
    if (!feedback?.trim() || awaitingPhase == null) return;
    try {
      await refinePhase(id, awaitingPhase, feedback);
      toast.success('בקשת התיקון נשלחה — Claude מעדכן...');
    } catch (err) {
      handleActionError(err);
      throw err; // let footer component keep the textarea open on error
    }
  }

  if (loading) return <div className="workspace-loading"><div className="pwa-spinner" /></div>;
  if (error) {
    const isSettingsErr = error.includes('מפתח') || error.includes('הגדרות') || error.includes('credit') || error.includes('קרדיט');
    return (
      <div className="workspace-error">
        <div className="workspace-error__msg">{error}</div>
        <div className="workspace-error__actions">
          {isSettingsErr && (
            <a href="/settings" className="btn btn--primary" style={{ fontSize: 13 }}>
              ⚙️ עבור להגדרות
            </a>
          )}
          <button className="btn btn--secondary" style={{ fontSize: 13 }} onClick={() => window.location.reload()}>
            🔄 נסה שוב
          </button>
          <a href="/dashboard" className="btn btn--secondary" style={{ fontSize: 13 }}>
            ← חזור לדשבורד
          </a>
        </div>
      </div>
    );
  }

  const isDeploying = project?.status === 'deploying' || Object.keys(deploySteps).length > 0;
  const isQuotaPaused = project?.status === 'quota_paused' || quotaError;

  const hasPhases      = phases.length > 0;
  const isRunning      = phases.some((p) => p.status === 'running');
  const notStarted     = !hasPhases;
  const awaitPhase     = phases.find((p) => p.index === awaitingPhase);
  const projectStatus  = project?.status;
  const isOnboarding   = projectStatus === 'onboarding';
  const isPaused       = projectStatus === 'paused';
  const isFailed       = projectStatus === 'failed';
  const inProgress     = ['coding', 'deploying', 'live'].includes(projectStatus);
  const hasStalledPhase = phases.some((p) => p.status === 'failed' || p.status === 'interrupted');
  const canStart       = notStarted && !inProgress && !isQuotaPaused;
  const canResume      = (isPaused || isFailed || hasStalledPhase) && !isRunning && hasPhases && !isQuotaPaused;

  // Estimated time remaining: each planning phase ≈ 2.5 min
  const TOTAL_PLANNING = 12;
  const completedCount = phases.filter((p) => p.status === 'completed' || p.status === 'awaiting_approval').length;
  const remainingPhases = Math.max(0, TOTAL_PLANNING - completedCount);
  const estMinutes = Math.round(remainingPhases * 2.5);
  const showEstTime = isRunning && remainingPhases > 0;

  return (
    <div className="workspace">
      {/* Celebration overlay */}
      {showCelebration && liveUrl && (
        <CelebrationOverlay
          liveUrl={liveUrl}
          githubUrl={liveGithubUrl}
          projectTitle={project?.title}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Top bar */}
      <header className="workspace-topbar">
        <button className="btn-ghost" onClick={() => navigate(`/projects/${id}/tasks`)} style={{ minHeight: 36, padding: '4px 12px' }}>📋 <span className="workspace-topbar__btn-label">משימות</span></button>
        <button className="btn-ghost" onClick={() => setShowProjectSettings(true)} style={{ minHeight: 36, padding: '4px 12px' }} title="הגדרות פרויקט">⚙️ <span className="workspace-topbar__btn-label">הגדרות</span></button>
        {isRunning && (
          <button
            className="btn-ghost"
            onClick={handlePause}
            title="עצור את הפייפליין"
            style={{ minHeight: 36, padding: '4px 10px', color: 'var(--danger)', fontSize: 13 }}
          >
            ⏸️ עצור
          </button>
        )}
        <div className="workspace-topbar__title">
          <span>⚡</span>
          <span className="workspace-topbar__project-name">{project?.title}</span>
        </div>
        <div className="workspace-progress">
          <div className="workspace-progress__fill" style={{ width: `${project?.completionPercent || 0}%` }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project?.completionPercent || 0}%</span>
        {isRunning && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            שלב {completedCount + 1}/{TOTAL_PLANNING}
          </span>
        )}
        {showEstTime && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            ~{estMinutes} דק׳
          </span>
        )}
        {rateLimit && rateLimit.used > 0 && (
          <span
            title={rateLimit.resetsAt ? `מתאפס ב-${new Date(rateLimit.resetsAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}
            style={{
              fontSize: 11, whiteSpace: 'nowrap', cursor: 'default',
              color: rateLimit.remaining === 0 ? 'var(--danger)' : 'var(--text-muted)',
            }}
          >
            🚀 {rateLimit.remaining}/{rateLimit.maxPerHour} starts
          </span>
        )}
        <div className="workspace-topbar__status">
          {liveUrl && (
            <button
              className="badge badge--live"
              onClick={() => setShowCelebration(true)}
              style={{ cursor: 'pointer', border: 0 }}
            >
              🎉 האפליקציה חיה!
            </button>
          )}
          {isRunning && <span className="badge badge--pulse">AI עובד...</span>}
          {awaitingPhase != null && !isRunning && (
            <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>ממתין לאישור</span>
          )}
          {/* Mobile-only join button — shown when LiveFeed panel is hidden */}
          {isMeetingLive && (
            <button
              className="btn btn--primary workspace-topbar__join-meeting"
              onClick={() => setShowMeetingRoom(true)}
              style={{ fontSize: 12, padding: '4px 10px', minHeight: 32 }}
            >
              🏢 הצטרף
            </button>
          )}
        </div>
      </header>

      {/* Fallback key hint — shown when using global user key instead of project key */}
      {hasApiKey && usingFallback && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '5px 16px',
                      background: 'rgba(124,58,237,0.08)', borderBottom: '1px solid var(--border)' }}>
          💡 משתמש במפתח Anthropic הגלובלי שלך —{' '}
          <a href="/settings" style={{ color: 'var(--brand-primary-light)' }}>הגדר מפתח פרויקט ייעודי</a>
        </div>
      )}

      {/* Missing API key banner — shown only when project has no key configured */}
      {hasApiKey === false && (
        <div className="workspace-settings-gate">
          <SettingsGate
            service="anthropic"
            projectId={id}
            onConfigured={() => setHasApiKey(true)}
          />
        </div>
      )}

      {/* Quota exhausted banner */}
      {isQuotaPaused && (
        <QuotaBanner
          message={quotaError?.message}
          projectId={id}
        />
      )}

      {/* Action errors now shown via toast — banner kept for fallback only */}
      {actionError && (
        <div className="workspace-action-error">
          <span>{actionError}</span>
          <button className="workspace-action-error__close" onClick={() => setActionError('')}>✕</button>
        </div>
      )}

      {/* Deployment status panel */}
      {(isDeploying || liveUrl || deployFailed) && (
        <div className="workspace-deploy-overlay">
          <DeploymentStatus steps={deploySteps} liveUrl={liveUrl} failed={deployFailed} />
        </div>
      )}

      {/* Project settings modal */}
      {showProjectSettings && (
        <ProjectSettingsModal
          projectId={id}
          projectTitle={project?.title}
          onClose={() => setShowProjectSettings(false)}
        />
      )}

      {/* Credentials gate modal — shown when pipeline pauses for service tokens */}
      {awaitingServices && (
        <CredentialsGateModal
          projectId={id}
          services={awaitingServices}
          onDone={() => setAwaitingServices(null)}
          onClose={() => setAwaitingServices(null)}
        />
      )}

      {/* Meeting room overlay */}
      {showMeetingRoom && (
        <MeetingRoomOverlay
          meetingMsgs={meetingMsgs}
          isMeetingLive={isMeetingLive}
          onClose={() => setShowMeetingRoom(false)}
        />
      )}

      {/* 3-panel layout */}
      <div className="workspace-body">
        {/* Left: Phase list (visually RIGHT in RTL) */}
        <aside className="workspace-sidebar" ref={sidebarRef} style={{ width: sidebarWidth }}>
          <PhaseList
            phases={phases}
            activeIndex={activePhaseIndex}
            onSelect={(idx) => {
              setActive(idx);
              loadDocument(idx);
            }}
          />

          {/* Discovery hint — shown for onboarding projects, but doesn't block */}
          {isOnboarding && (
            <div className="workspace-discovery-cta">
              <p className="workspace-discovery-cta__text">
                מומלץ להשלים את שאלון הגילוי לקבלת תוצאות טובות יותר.
              </p>
              <button
                className="btn btn--secondary btn--full"
                style={{ marginBottom: 8 }}
                onClick={() => navigate('/new-project')}
              >
                ← השלם שאלון גילוי
              </button>
            </div>
          )}

          {/* Start / Resume button */}
          {canStart && (
            <div className="workspace-start-btn">
              <button className="btn btn--primary btn--full" onClick={handleStart}>
                🚀 התחל את פייפליין התכנון
              </button>
            </div>
          )}

          {canResume && (
            <div className="workspace-start-btn">
              <button className="btn btn--primary btn--full" onClick={handleStart}>
                {isPaused ? '▶️ המשך Pipeline' : '🔄 נסה שוב'}
              </button>
            </div>
          )}
        </aside>

        <div className="workspace-resize-handle" onMouseDown={(e) => startResize(e, 'sidebar')} />

        {/* Center: Document output + approval footer */}
        <div className="workspace-center">
          {/* Mobile-only phase name label */}
          {activePhaseIndex !== null && (() => {
            const cfg = ALL_PHASES.find((p) => p.index === activePhaseIndex);
            return cfg ? (
              <div className="workspace-mobile-phase-title">
                {cfg.icon} {lang === 'he' ? cfg.nameHe : cfg.name}
              </div>
            ) : null;
          })()}

          {/* Sticky doc bar — export + approve always visible */}
          {activeDoc && (
            <div className="workspace-doc-bar">
              <button
                className="btn-ghost workspace-doc-bar__export"
                onClick={handleExportDoc}
                title="הורד כקובץ Markdown"
              >
                ⬇️ ייצוא
              </button>
              {awaitingPhase !== null && awaitingPhase === activePhaseIndex && (
                <button
                  className={`btn btn--primary workspace-doc-bar__approve${hasScrolledToBottom ? ' workspace-approval-footer__approve--unlocked' : ''}`}
                  onClick={handleApprove}
                  disabled={!hasScrolledToBottom}
                  title={!hasScrolledToBottom ? 'גלול עד הסוף לקריאת המסמך' : ''}
                >
                  ✅ אשר והמשך
                </button>
              )}
            </div>
          )}

          <main className="workspace-main" ref={mainRef}>
            {activeDoc ? (
              <div className="workspace-doc">
                <SafeMarkdown content={activeDoc.content} className="workspace-doc__content" />
              </div>
            ) : (
              <div className="workspace-empty">
                {isRunning ? (
                  <div className="workspace-empty__running">
                    <div className="pwa-spinner" style={{ width: 48, height: 48 }} />
                    <p>Claude עובד על השלב הזה...</p>
                  </div>
                ) : notStarted ? (
                  <div className="workspace-empty">
                    <div style={{ fontSize: 48 }}>🚀</div>
                    <p>לחץ "התחל" בסרגל הצד כדי להתחיל את פייפליין התכנון</p>
                  </div>
                ) : (
                  <div className="workspace-empty">
                    <div style={{ fontSize: 48 }}>👈</div>
                    <p>בחר שלב מהרשימה כדי לצפות במסמך</p>
                  </div>
                )}
              </div>
            )}
          </main>

          {awaitingPhase !== null && awaitingPhase === activePhaseIndex && (
            <WorkspaceApprovalFooter
              phaseIndex={awaitingPhase}
              canApprove={hasScrolledToBottom}
              refineCount={awaitPhase?.refineCount || 0}
              onApprove={handleApprove}
              onRefineSubmit={handleRefine}
            />
          )}
        </div>

        <div className="workspace-resize-handle" onMouseDown={(e) => startResize(e, 'feed')} />

        {/* Right: Live feed (visually LEFT in RTL) */}
        <div ref={feedWrapperRef} className="workspace-feed-wrapper" style={{ width: feedWidth }}>
          <LiveFeed
            meetingMsgs={meetingMsgs}
            consultantMsgs={consultantMsgs}
            consultantsRunning={consultantsRunning}
            techLogs={techLogs}
            isRunning={isRunning}
            activeTab={activeFeedTab}
            onTabChange={setActiveFeedTab}
            scheduledMeeting={scheduledMeeting}
            isMeetingLive={isMeetingLive}
            missedMeeting={missedMeeting}
            onClearMissed={() => setMissedMeeting(false)}
            onJoinMeeting={() => setShowMeetingRoom(true)}
            activePhaseIndex={activePhaseIndex}
          />
        </div>
      </div>
    </div>
  );
}

function upsertPhase(phases, index, updates) {
  const existing = phases.find((p) => p.index === index);
  if (existing) {
    return phases.map((p) => (p.index === index ? { ...p, ...updates } : p));
  }
  return [...phases, { index, ...updates }].sort((a, b) => a.index - b.index);
}
