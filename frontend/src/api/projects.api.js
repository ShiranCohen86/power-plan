import { safeRequest } from './request';

export const createProject = (data) =>
  safeRequest({ method: 'post', url: '/projects', data });

export const listProjects = () =>
  safeRequest({ method: 'get', url: '/projects' });

export const getProject = (id) =>
  safeRequest({ method: 'get', url: `/projects/${id}` });

export const discoveryComplete = (id, answers) =>
  safeRequest({ method: 'post', url: `/projects/${id}/discovery/complete`, data: { answers } });

/**
 * Opens an SSE connection to stream the next discovery question.
 * Returns an EventSource-compatible fetch stream.
 * Calls onChunk(text) for each streamed token, onDone({ finished }) when complete.
 */
export function discoveryNextSSE(id, answers, { onChunk, onDone, onError }) {
  const controller = new AbortController();

  fetch(`/api/projects/${id}/discovery/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onError(new Error(err.error || 'Discovery request failed'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

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
            // malformed SSE line — skip
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return controller;
}
