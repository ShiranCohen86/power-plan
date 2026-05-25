import { safeRequest } from './request';

export const getAgentLogs = (projectId) =>
  safeRequest({ method: 'get', url: `/projects/${projectId}/agents/logs` });
