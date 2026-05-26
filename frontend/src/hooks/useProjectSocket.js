import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Joins a project WebSocket room and subscribes to pipeline events.
 * handlers: { onPhaseStarted, onPhaseNarrative, onPhaseCompleted,
 *             onPhaseAwaiting, onMeetingStarted, onMeetingMessage,
 *             onMeetingCompleted, onPipelineError }
 *
 * Re-runs when `connected` changes so we catch a late socket initialization.
 */
export function useProjectSocket(projectId, handlers = {}) {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket.current || !projectId) return;

    socket.current.emit('join:project', projectId);

    const on = (event, fn) => fn && socket.current.on(event, fn);
    const off = (event, fn) => fn && socket.current.off(event, fn);

    on('phase:started',            handlers.onPhaseStarted);
    on('phase:narrative',          handlers.onPhaseNarrative);
    on('phase:completed',          handlers.onPhaseCompleted);
    on('phase:awaiting_approval',  handlers.onPhaseAwaiting);
    on('phase:approved',           handlers.onPhaseApproved);
    on('phase:refining',           handlers.onPhaseRefining);
    on('phase:failed',             handlers.onPhaseFailed);
    on('meeting:started',          handlers.onMeetingStarted);
    on('meeting:message',          handlers.onMeetingMessage);
    on('meeting:completed',        handlers.onMeetingCompleted);
    on('pipeline:started',           handlers.onPipelineStarted);
    on('pipeline:planning_complete', handlers.onPlanningComplete);
    on('pipeline:paused',            handlers.onPipelinePaused);
    on('pipeline:error',             handlers.onPipelineError);
    on('pipeline:quota_exhausted',   handlers.onQuotaExhausted);
    on('pipeline:status',            handlers.onPipelineStatus);
    on('deployment:step',            handlers.onDeploymentStep);
    on('deployment:completed',       handlers.onDeploymentCompleted);
    on('deployment:failed',          handlers.onDeploymentFailed);
    on('celebration:trigger',        handlers.onCelebration);
    on('agent:log',                  handlers.onAgentLog);
    on('file:written',               handlers.onFileWritten);
    on('file:secret_detected',       handlers.onSecretDetected);
    on('pipeline:codegen_complete',  handlers.onCodegenComplete);
    on('consultants:started',        handlers.onConsultantsStarted);
    on('consultants:message',        handlers.onConsultantsMessage);
    on('consultants:completed',      handlers.onConsultantsCompleted);

    return () => {
      socket.current.emit('leave:project', projectId);
      off('phase:started',            handlers.onPhaseStarted);
      off('phase:narrative',          handlers.onPhaseNarrative);
      off('phase:completed',          handlers.onPhaseCompleted);
      off('phase:awaiting_approval',  handlers.onPhaseAwaiting);
      off('phase:approved',           handlers.onPhaseApproved);
      off('phase:refining',           handlers.onPhaseRefining);
      off('phase:failed',             handlers.onPhaseFailed);
      off('meeting:started',          handlers.onMeetingStarted);
      off('meeting:message',          handlers.onMeetingMessage);
      off('meeting:completed',        handlers.onMeetingCompleted);
      off('pipeline:started',           handlers.onPipelineStarted);
      off('pipeline:planning_complete', handlers.onPlanningComplete);
      off('pipeline:paused',            handlers.onPipelinePaused);
      off('pipeline:error',             handlers.onPipelineError);
      off('pipeline:quota_exhausted',   handlers.onQuotaExhausted);
      off('pipeline:status',            handlers.onPipelineStatus);
      off('deployment:step',            handlers.onDeploymentStep);
      off('deployment:completed',       handlers.onDeploymentCompleted);
      off('deployment:failed',          handlers.onDeploymentFailed);
      off('celebration:trigger',        handlers.onCelebration);
      off('agent:log',                  handlers.onAgentLog);
      off('file:written',               handlers.onFileWritten);
      off('file:secret_detected',       handlers.onSecretDetected);
      off('pipeline:codegen_complete',  handlers.onCodegenComplete);
      off('consultants:started',        handlers.onConsultantsStarted);
      off('consultants:message',        handlers.onConsultantsMessage);
      off('consultants:completed',      handlers.onConsultantsCompleted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, connected]);
}
