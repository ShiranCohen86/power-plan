import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SafeMarkdown from '../components/ui/SafeMarkdown';

import { selectProjectById, updateProject } from '../store/slices/projectsSlice';
import { useProjectSocket } from '../hooks/useProjectSocket';
import {
  startPipeline, pausePipeline, approvePhase, refinePhase,
  getPipelineStatus, getPhaseDocument,
} from '../api/pipeline.api';
import { getProject, getProjectSettings } from '../api/projects.api';

import PhaseList          from '../components/workspace/PhaseList';
import LiveFeed           from '../components/workspace/LiveFeed';
import ApprovalBar        from '../components/workspace/ApprovalBar';
import QuotaBanner        from '../components/workspace/QuotaBanner';
import DeploymentStatus   from '../components/workspace/DeploymentStatus';
import CelebrationOverlay from '../components/workspace/CelebrationOverlay';
import SettingsGate       from '../components/SettingsGate';

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
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const [project, setProject]           = useState(null);
  const [phases, setPhases]             = useState([]);
  const [activePhaseIndex, setActive]   = useState(null);
  const [activeDoc, setActiveDoc]       = useState(null);
  const [narrativeBuffer, setNarrative] = useState('');
  const [meetingMsgs, setMeetingMsgs]   = useState([]);
  const [techLogs, setTechLogs]         = useState([]);
  const [activeAgent, setActiveAgent]   = useState(null);
  const [awaitingPhase, setAwaiting]    = useState(null);
  const [refineOpen, setRefineOpen]     = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
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

  // Load project + pipeline status
  useEffect(() => {
    (async () => {
      try {
        const [projRes, statusRes, settingsRes] = await Promise.all([
          getProject(id),
          getPipelineStatus(id),
          getProjectSettings(id).catch(() => null),
        ]);
        setProject(projRes);
        setPhases(statusRes.phases || []);
        setHasApiKey(settingsRes ? settingsRes.hasApiKey : true);

        // If there's a phase awaiting approval, set it
        const waiting = (statusRes.phases || []).find((p) => p.status === 'awaiting_approval');
        if (waiting) {
          setAwaiting(waiting.index);
          setActive(waiting.index);
          loadDocument(waiting.index);
        }
      } catch {
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function loadDocument(phaseIndex) {
    try {
      const res = await getPhaseDocument(id, phaseIndex);
      setActiveDoc(res);
    } catch {
      setActiveDoc(null);
    }
  }

  // WebSocket event handlers
  useProjectSocket(id, {
    onPhaseStarted: ({ phaseIndex, agentName }) => {
      setActive(phaseIndex);
      setNarrative('');
      setMeetingMsgs([]);
      setActiveAgent(agentName);
      setTechLogs((prev) => [...prev, { agentName, event: 'started', timestamp: new Date() }]);
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'running', agentName }));
    },
    onPhaseNarrative: ({ phaseIndex, chunk }) => {
      if (phaseIndex === activePhaseIndex || activePhaseIndex === null) {
        setNarrative((prev) => prev + chunk);
      }
    },
    onPhaseCompleted: ({ phaseIndex, tokensUsed }) => {
      setPhases((prev) => upsertPhase(prev, phaseIndex, { status: 'awaiting_approval' }));
      setActiveAgent(null);
      setTechLogs((prev) => [...prev, {
        agentName: phases.find((p) => p.index === phaseIndex)?.agentName || '',
        event: 'completed', metadata: { tokensUsed }, timestamp: new Date(),
      }]);
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
    },
    onMeetingStarted: ({ participants }) => {
      setMeetingMsgs([]);
    },
    onMeetingMessage: (msg) => {
      setMeetingMsgs((prev) => [...prev, msg]);
    },
    onPlanningComplete: () => {
      setProject((p) => p ? { ...p, completionPercent: 50 } : p);
    },
    onQuotaExhausted: ({ message }) => {
      setQuotaError({ message, plan: project?.plan || 'starter' });
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
    try {
      await startPipeline(id);
      toast.success('הפייפליין התחיל!');
    } catch (err) {
      handleActionError(err);
    }
  }

  async function handleApprove() {
    if (awaitingPhase == null) return;
    try {
      await approvePhase(id, awaitingPhase);
      setAwaiting(null);
      setRefineOpen(false);
      toast.success('השלב אושר — ממשיך לשלב הבא');
    } catch (err) {
      handleActionError(err);
    }
  }

  async function handleRefine() {
    if (!refineFeedback.trim() || awaitingPhase == null) return;
    try {
      await refinePhase(id, awaitingPhase, refineFeedback);
      setRefineOpen(false);
      setRefineFeedback('');
      setNarrative('');
      toast.success('בקשת התיקון נשלחה — Claude מעדכן...');
    } catch (err) {
      handleActionError(err);
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
  const canStart       = notStarted && !inProgress;
  const canResume      = (isPaused || isFailed) && hasPhases;

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
        <button className="btn-ghost" onClick={() => navigate(`/projects/${id}/tasks`)} style={{ minHeight: 36, padding: '4px 12px' }}>📋 משימות</button>
        <div className="workspace-topbar__title">
          <span>⚡</span>
          <span>{project?.title}</span>
        </div>
        <div className="workspace-progress">
          <div className="workspace-progress__fill" style={{ width: `${project?.completionPercent || 0}%` }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project?.completionPercent || 0}%</span>
        {showEstTime && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            ~{estMinutes} דק׳
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
        </div>
      </header>

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
          plan={quotaError?.plan || project?.plan}
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

      {/* 3-panel layout */}
      <div className="workspace-body">
        {/* Left: Phase list */}
        <aside className="workspace-sidebar">
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

        {/* Center: Document output */}
        <main className="workspace-main">
          {activeDoc ? (
            <div className="workspace-doc">
              <SafeMarkdown content={activeDoc.content} className="workspace-doc__content" />

              {awaitingPhase === activePhaseIndex && (
                <ApprovalBar
                  phaseIndex={awaitingPhase}
                  refineCount={awaitPhase?.refineCount || 0}
                  refineOpen={refineOpen}
                  refineFeedback={refineFeedback}
                  onRefineOpen={() => setRefineOpen(true)}
                  onRefineClose={() => setRefineOpen(false)}
                  onRefineFeedbackChange={setRefineFeedback}
                  onApprove={handleApprove}
                  onRefineSubmit={handleRefine}
                />
              )}
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
                  <p>Select a phase to view its document</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right: Live feed */}
        <LiveFeed
          narrative={narrativeBuffer}
          meetingMsgs={meetingMsgs}
          consultantMsgs={consultantMsgs}
          consultantsRunning={consultantsRunning}
          techLogs={techLogs}
          isRunning={isRunning}
          activeAgent={activeAgent}
        />
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
