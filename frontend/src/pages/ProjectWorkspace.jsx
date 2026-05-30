import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ALL_PHASES } from '../utils/phaseConfig';
import { useWorkspaceState } from '../hooks/useWorkspaceState';

import PhaseList              from '../components/workspace/PhaseList';
import FeatureErrorBoundary   from '../components/ui/FeatureErrorBoundary';
import LiveFeed               from '../components/workspace/LiveFeed';
import WorkspaceApprovalFooter from '../components/workspace/WorkspaceApprovalFooter';
import WorkspaceTopbar        from '../components/workspace/WorkspaceTopbar';
import WorkspaceModals        from '../components/workspace/WorkspaceModals';
import QuotaBanner            from '../components/workspace/QuotaBanner';
import DeploymentStatus       from '../components/workspace/DeploymentStatus';
import SettingsGate           from '../components/SettingsGate';
import SafeMarkdown           from '../components/ui/SafeMarkdown';
import Skeleton               from '@mui/material/Skeleton';

function PhaseIntroOverlay({ count, done }) {
  const cfg = ALL_PHASES.find((p) => p.index === count - 1);
  return (
    <div className={`phase-intro-overlay${done ? ' phase-intro-overlay--done' : ''}`}>
      <div className="phase-intro-overlay__icon">{cfg?.icon || '⚡'}</div>
      <div className="phase-intro-overlay__num">{count}</div>
      <div className="phase-intro-overlay__name">{cfg?.nameHe || cfg?.name || ''}</div>
    </div>
  );
}

export default function ProjectWorkspace() {
  const { id }   = useParams();
  const { t }    = useTranslation();
  const { lang } = useLanguage();

  const ws = useWorkspaceState(id);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (ws.loading) return <div className="workspace-loading"><div className="pwa-spinner" /></div>;
  if (ws.error) {
    const isSettingsErr = ws.error.includes('מפתח') || ws.error.includes('הגדרות') ||
                          ws.error.includes('credit') || ws.error.includes('קרדיט');
    return (
      <div className="workspace-error">
        <div className="workspace-error__msg">{ws.error}</div>
        <div className="workspace-error__actions">
          {isSettingsErr && (
            <a href="/settings" className="btn btn--primary" style={{ fontSize: 13 }}>⚙️ עבור להגדרות</a>
          )}
          <button className="btn btn--secondary" style={{ fontSize: 13 }} onClick={() => window.location.reload()}>
            🔄 נסה שוב
          </button>
          <a href="/dashboard" className="btn btn--secondary" style={{ fontSize: 13 }}>← חזור לדשבורד</a>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      {/* Phase entry animation */}
      {ws.introCount !== null && (
        <PhaseIntroOverlay count={ws.introCount} done={ws.introCount >= 1} />
      )}

      {/* Modals (celebration, settings, credentials, meeting room) */}
      <WorkspaceModals
        showCelebration={ws.showCelebration}
        onCloseCelebration={() => ws.setShowCelebration(false)}
        liveUrl={ws.liveUrl}
        liveGithubUrl={ws.liveGithubUrl}
        projectTitle={ws.project?.title}
        showProjectSettings={ws.showProjectSettings}
        onCloseSettings={() => ws.setShowProjectSettings(false)}
        projectId={id}
        awaitingServices={ws.awaitingServices}
        onServicesClose={() => ws.setAwaitingServices(null)}
        showMeetingRoom={ws.showMeetingRoom}
        onCloseMeeting={() => ws.setShowMeetingRoom(false)}
        meetingMsgs={ws.meetingMsgs}
        isMeetingLive={ws.isMeetingLive}
      />

      {/* Top bar */}
      <WorkspaceTopbar
        project={ws.project}
        id={id}
        isRunning={ws.isRunning}
        isMeetingLive={ws.isMeetingLive}
        awaitingPhase={ws.awaitingPhase}
        completedCount={ws.completedCount}
        TOTAL_PLANNING={ws.TOTAL_PLANNING}
        estMinutes={ws.estMinutes}
        showEstTime={ws.showEstTime}
        rateLimit={ws.rateLimit}
        liveUrl={ws.liveUrl}
        onCelebrate={() => ws.setShowCelebration(true)}
        onPause={ws.handlePause}
        onOpenSettings={() => ws.setShowProjectSettings(true)}
        onJoinMeeting={() => ws.setShowMeetingRoom(true)}
      />


      {/* Missing API key */}
      {ws.hasApiKey === false && (
        <div className="workspace-settings-gate">
          <SettingsGate service="anthropic" projectId={id} onConfigured={() => ws.setHasApiKey(true)} />
        </div>
      )}

      {/* Quota exhausted */}
      {ws.isQuotaPaused && <QuotaBanner message={ws.quotaError?.message} projectId={id} />}

      {/* Action error banner */}
      {ws.actionError && (
        <div className="workspace-action-error">
          <span>{ws.actionError}</span>
          <button className="workspace-action-error__close" onClick={() => ws.setActionError('')}>✕</button>
        </div>
      )}

      {/* Deployment status */}
      {(ws.isDeploying || ws.liveUrl || ws.deployFailed) && (
        <div className="workspace-deploy-overlay">
          <FeatureErrorBoundary>
            <DeploymentStatus steps={ws.deploySteps} liveUrl={ws.liveUrl} failed={ws.deployFailed} />
          </FeatureErrorBoundary>
        </div>
      )}

      {/* 3-panel layout */}
      <div className="workspace-body">
        {/* Sidebar: Phase list */}
        <aside className="workspace-sidebar" ref={ws.sidebarRef} style={{ width: ws.sidebarWidth }}>
          {ws.loading ? (
            <div style={{ padding: '12px 8px' }}>
              {[0,1,2,3,4].map((i) => (
                <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 1, borderRadius: 1.5 }} />
              ))}
            </div>
          ) : (
            <FeatureErrorBoundary>
              <PhaseList
                phases={ws.phases}
                activeIndex={ws.activePhaseIndex}
                onSelect={(idx) => { ws.setActive(idx); ws.loadDocument(idx); }}
                onRollback={!ws.isRunning ? ws.handleRollback : null}
              />
            </FeatureErrorBoundary>
          )}

          {ws.isOnboarding && (
            <div className="workspace-discovery-cta">
              <p className="workspace-discovery-cta__text">מומלץ להשלים את שאלון הגילוי לקבלת תוצאות טובות יותר.</p>
              <button className="btn btn--secondary btn--full" style={{ marginBottom: 8 }}
                      onClick={() => ws.navigate('/new-project')}>
                ← השלם שאלון גילוי
              </button>
            </div>
          )}

          {ws.canStart && (
            <div className="workspace-start-btn">
              <button className="btn btn--primary btn--full" onClick={ws.handleStart}>
                🚀 התחל את פייפליין התכנון
              </button>
            </div>
          )}

          {ws.canResume && (() => {
            const nextPhase = ws.phases.find((p) =>
              p.status === 'pending' || p.status === 'interrupted' || p.status === 'failed'
            );
            const nextCfg = nextPhase ? ALL_PHASES.find((p) => p.index === nextPhase.index) : null;
            const nextLabel = nextCfg ? (lang === 'he' ? nextCfg.nameHe : nextCfg.name) : null;
            return (
              <div className="workspace-start-btn">
                <button className="btn btn--primary btn--full" onClick={ws.isFailed ? ws.handleRetry : ws.handleStart}>
                  {ws.isPaused
                    ? `▶️ המשך: ${nextLabel || 'שלב הבא'}`
                    : '🔄 נסה שוב'}
                </button>
              </div>
            );
          })()}
        </aside>

        <div className="workspace-resize-handle" onMouseDown={(e) => ws.startResize(e, 'sidebar')} />

        {/* Center: Document output */}
        <div className="workspace-center">
          {ws.activePhaseIndex !== null && (() => {
            const cfg = ALL_PHASES.find((p) => p.index === ws.activePhaseIndex);
            return cfg ? (
              <div className="workspace-mobile-phase-title">
                {cfg.icon} {lang === 'he' ? cfg.nameHe : cfg.name}
              </div>
            ) : null;
          })()}

          {ws.activeDoc && (
            <div className="workspace-doc-bar">
{ws.awaitingPhase !== null && ws.awaitingPhase === ws.activePhaseIndex && (
                <button
                  className={`btn btn--primary workspace-doc-bar__approve${ws.hasScrolledToBottom ? ' workspace-approval-footer__approve--unlocked' : ''}`}
                  onClick={ws.handleApprove}
                  disabled={!ws.hasScrolledToBottom}
                  title={!ws.hasScrolledToBottom ? 'גלול עד הסוף לקריאת המסמך' : ''}
                >
                  ✅ אשר והמשך
                </button>
              )}
            </div>
          )}

          <main className="workspace-main" ref={ws.mainRef}>
            {ws.loading ? (
              <div>
                <Skeleton variant="text" width="45%" height={32} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 1.5, mb: 2 }} />
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="85%" />
                <Skeleton variant="text" width="70%" />
              </div>
            ) : ws.activeDoc ? (
              <div className="workspace-doc">
                <SafeMarkdown content={ws.activeDoc.content} className="workspace-doc__content" />
              </div>
            ) : (
              <div className="workspace-empty">
                {ws.isRunning ? (
                  <div className="workspace-empty__running">
                    <div className="pwa-spinner" style={{ width: 48, height: 48 }} />
                    <p>Claude עובד על השלב הזה...</p>
                  </div>
                ) : ws.notStarted ? (
                  <div className="workspace-empty">
                    <div style={{ fontSize: 48 }}>🚀</div>
                    <p>לחץ "התחל" בסרגל הצד כדי להתחיל את פייפליין התכנון</p>
                  </div>
                ) : null}
              </div>
            )}
          </main>

          {ws.awaitingPhase !== null && ws.awaitingPhase === ws.activePhaseIndex && (
            <WorkspaceApprovalFooter
              phaseIndex={ws.awaitingPhase}
              canApprove={ws.hasScrolledToBottom}
              refineCount={ws.awaitPhase?.refineCount || 0}
              onApprove={ws.handleApprove}
              onRefineSubmit={ws.handleRefine}
            />
          )}
        </div>

        <div className="workspace-resize-handle" onMouseDown={(e) => ws.startResize(e, 'feed')} />

        {/* Live feed */}
        <div ref={ws.feedWrapperRef} className="workspace-feed-wrapper" style={{ width: ws.feedWidth }}>
          <FeatureErrorBoundary>
            <LiveFeed
              meetingMsgs={ws.meetingMsgs}
              consultantMsgs={ws.consultantMsgs}
              consultantsRunning={ws.consultantsRunning}
              techLogs={ws.techLogs}
              isRunning={ws.isRunning}
              activeTab={ws.activeFeedTab}
              onTabChange={ws.setActiveFeedTab}
              scheduledMeeting={ws.scheduledMeeting}
              isMeetingLive={ws.isMeetingLive}
              missedMeeting={ws.missedMeeting}
              onClearMissed={() => ws.setMissedMeeting(false)}
              onJoinMeeting={() => ws.setShowMeetingRoom(true)}
              activePhaseIndex={ws.activePhaseIndex}
            />
          </FeatureErrorBoundary>
        </div>
      </div>
    </div>
  );
}
