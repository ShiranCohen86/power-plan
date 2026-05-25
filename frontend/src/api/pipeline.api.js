import { safeRequest } from './request';

const base = (projectId) => `/projects/${projectId}/pipeline`;

export const startPipeline  = (projectId) =>
  safeRequest({ method: 'post', url: `${base(projectId)}/start` });

export const pausePipeline  = (projectId) =>
  safeRequest({ method: 'post', url: `${base(projectId)}/pause` });

export const getPipelineStatus = (projectId) =>
  safeRequest({ method: 'get', url: `${base(projectId)}/status` });

export const approvePhase = (projectId, phaseIndex) =>
  safeRequest({ method: 'post', url: `${base(projectId)}/approve`, data: { phaseIndex } });

export const refinePhase = (projectId, phaseIndex, feedback) =>
  safeRequest({ method: 'post', url: `${base(projectId)}/refine`, data: { phaseIndex, feedback } });

export const listPhases = (projectId) =>
  safeRequest({ method: 'get', url: `/projects/${projectId}/phases` });

export const getPhaseDocument = (projectId, phaseIndex) =>
  safeRequest({ method: 'get', url: `/projects/${projectId}/phases/${phaseIndex}/document` });
