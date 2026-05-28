// Thin wrapper — no-ops when PostHog is not initialised
function track(event, props) {
  try {
    if (window.posthog?.capture) window.posthog.capture(event, props);
  } catch { /* non-fatal */ }
}

export const analytics = {
  projectCreated:     (projectId) => track('project_created', { projectId }),
  pipelineStarted:    (projectId) => track('pipeline_started', { projectId }),
  phaseApproved:      (projectId, phaseIndex) => track('phase_approved', { projectId, phaseIndex }),
  appDeployed:        (projectId, liveUrl) => track('app_deployed', { projectId, liveUrl }),
  apiKeySaved:        () => track('settings_api_key_saved'),
};
