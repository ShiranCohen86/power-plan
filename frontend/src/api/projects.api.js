import { safeRequest, getAccessToken } from './request';

const DISCOVERY_SSE_TIMEOUT_MS = 45_000;

export const createProject = (data) =>
  safeRequest({ method: 'post', url: '/projects', data });

export const listProjects = ({ page = 1, limit = 12, search = '', sort = 'date', statusFilter = '', signal } = {}) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (sort && sort !== 'date') params.sort = sort;
  if (statusFilter) params.status = statusFilter;
  return safeRequest({ method: 'get', url: '/projects', params, signal });
};

export const getProject = (id, signal) =>
  safeRequest({ method: 'get', url: `/projects/${id}`, signal });

export const deleteProject = (id) =>
  safeRequest({ method: 'delete', url: `/projects/${id}` });

export const cloneProject   = (id) => safeRequest({ method: 'post',  url: `/projects/${id}/clone` });
export const archiveProject   = (id) => safeRequest({ method: 'patch', url: `/projects/${id}/archive` });
export const generateReadme   = (id) => safeRequest({ method: 'post',  url: `/projects/${id}/generate-readme` });

export const restoreProject = (id) =>
  safeRequest({ method: 'patch', url: `/projects/${id}/restore` });

export const discoveryComplete = (id, answers) =>
  safeRequest({ method: 'post', url: `/projects/${id}/discovery/complete`, data: { answers } });

export const saveDiscoveryProgress = (id, answers) =>
  safeRequest({ method: 'patch', url: `/projects/${id}/discovery-progress`, data: { answers } });

export const getMeetings = (id) =>
  safeRequest({ method: 'get', url: `/projects/${id}/meetings` });

// Per-project settings
export const getProjectSettings    = (id) =>
  safeRequest({ method: 'get', url: `/projects/${id}/settings` });

export const setProjectApiKey      = (id, apiKey) =>
  safeRequest({ method: 'put', url: `/projects/${id}/settings/api-key`, data: { apiKey } });

export const deleteProjectApiKey   = (id) =>
  safeRequest({ method: 'delete', url: `/projects/${id}/settings/api-key` });

export const setProjectGithubToken    = (id, token) =>
  safeRequest({ method: 'put',    url: `/projects/${id}/settings/github-token`, data: { token } });

export const deleteProjectGithubToken = (id) =>
  safeRequest({ method: 'delete', url: `/projects/${id}/settings/github-token` });

export const setProjectRenderToken    = (id, token) =>
  safeRequest({ method: 'put',    url: `/projects/${id}/settings/render-token`, data: { token } });

export const deleteProjectRenderToken = (id) =>
  safeRequest({ method: 'delete', url: `/projects/${id}/settings/render-token` });

export const getRequiredServices = (id) =>
  safeRequest({ method: 'get', url: `/projects/${id}/required-services` });

export const saveServiceCredentials = (id, serviceId, credentials) =>
  safeRequest({ method: 'post', url: `/projects/${id}/required-services/${serviceId}/credentials`, data: { credentials } });

export const skipServiceCredentials = (id, serviceId) =>
  safeRequest({ method: 'patch', url: `/projects/${id}/required-services/${serviceId}/skip` });

export const consultService = (id, serviceId) =>
  safeRequest({ method: 'post', url: `/projects/${id}/required-services/${serviceId}/consult` });

/**
 * Opens an SSE connection to stream the next discovery question.
 * Returns an AbortController so the caller can cancel the stream.
 * Calls onChunk(text) for each streamed token, onDone({ finished }) when complete.
 *
 * Uses apiBaseUrl from env so it works in both same-origin (Render) and
 * cross-origin (separate Vercel/Render split) deployments.
 */
export function discoveryNextSSE(id, answers, { onChunk, onDone, onError }) {
  const controller = new AbortController();
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';

  // Abort if the backend never responds within 45 seconds (cold-start safety net)
  const timeoutId = setTimeout(() => {
    controller.abort();
    onError(new Error('Discovery request timed out — please try again'));
  }, DISCOVERY_SSE_TIMEOUT_MS);

  const token = getAccessToken();
  fetch(`${apiBaseUrl}/api/projects/${id}/discovery/next`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ answers }),
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(new Error(err.error || `Discovery request failed (${res.status})`));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE lines are separated by \n; events by \n\n — process line by line
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.error) {
              onError(new Error(payload.error));
            } else if (payload.done) {
              onDone({ finished: !!payload.finished });
            } else if (payload.chunk) {
              onChunk(payload.chunk);
            }
          } catch {
            // malformed SSE line — skip silently
          }
        }
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') onError(err);
    });

  return controller;
}
