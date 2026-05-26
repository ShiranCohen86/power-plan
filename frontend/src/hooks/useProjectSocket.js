import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Joins a project WebSocket room and subscribes to pipeline events.
 * Uses a ref to always call the latest handler functions without
 * re-registering listeners on every render.
 */
export function useProjectSocket(projectId, handlers = {}) {
  const { socket, connected } = useSocket();
  const handlersRef = useRef(handlers);

  // Keep ref up-to-date on every render without re-triggering the effect
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!socket.current || !projectId) return;

    socket.current.emit('join:project', projectId);

    const wrap = (key) => (...args) => handlersRef.current[key]?.(...args);

    const listeners = {
      'phase:started':             wrap('onPhaseStarted'),
      'phase:narrative':           wrap('onPhaseNarrative'),
      'phase:completed':           wrap('onPhaseCompleted'),
      'phase:awaiting_approval':   wrap('onPhaseAwaiting'),
      'phase:approved':            wrap('onPhaseApproved'),
      'phase:refining':            wrap('onPhaseRefining'),
      'phase:failed':              wrap('onPhaseFailed'),
      'meeting:started':           wrap('onMeetingStarted'),
      'meeting:message':           wrap('onMeetingMessage'),
      'meeting:completed':         wrap('onMeetingCompleted'),
      'pipeline:started':          wrap('onPipelineStarted'),
      'pipeline:planning_complete':wrap('onPlanningComplete'),
      'pipeline:paused':           wrap('onPipelinePaused'),
      'pipeline:error':            wrap('onPipelineError'),
      'pipeline:quota_exhausted':  wrap('onQuotaExhausted'),
      'pipeline:status':           wrap('onPipelineStatus'),
      'deployment:step':           wrap('onDeploymentStep'),
      'deployment:completed':      wrap('onDeploymentCompleted'),
      'deployment:failed':         wrap('onDeploymentFailed'),
      'celebration:trigger':       wrap('onCelebration'),
      'agent:log':                 wrap('onAgentLog'),
      'file:written':              wrap('onFileWritten'),
      'file:secret_detected':      wrap('onSecretDetected'),
      'pipeline:codegen_complete': wrap('onCodegenComplete'),
      'consultants:started':       wrap('onConsultantsStarted'),
      'consultants:message':       wrap('onConsultantsMessage'),
      'consultants:completed':     wrap('onConsultantsCompleted'),
    };

    Object.entries(listeners).forEach(([event, fn]) => socket.current.on(event, fn));

    return () => {
      socket.current.emit('leave:project', projectId);
      Object.entries(listeners).forEach(([event, fn]) => socket.current.off(event, fn));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, connected]);
}
