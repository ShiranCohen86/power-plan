import { safeRequest } from './request';

const base = (projectId) => `/projects/${projectId}/sprints`;

export const listSprints  = (projectId) =>
  safeRequest({ method: 'get', url: base(projectId) });

export const getSprint    = (projectId, sprintIndex) =>
  safeRequest({ method: 'get', url: `${base(projectId)}/${sprintIndex}` });
