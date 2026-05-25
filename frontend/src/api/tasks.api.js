import { safeRequest } from './request';

const base = (projectId) => `/projects/${projectId}/tasks`;

export const listTasks    = (projectId) =>
  safeRequest({ method: 'get', url: base(projectId) });

export const getEpicTree  = (projectId) =>
  safeRequest({ method: 'get', url: `${base(projectId)}/epics` });

export const getTasksBySprint = (projectId, sprintIndex) =>
  safeRequest({ method: 'get', url: `${base(projectId)}/sprint/${sprintIndex}` });

export const updateTaskStatus = (projectId, taskId, status) =>
  safeRequest({ method: 'patch', url: `${base(projectId)}/${taskId}/status`, data: { status } });
