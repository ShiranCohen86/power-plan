import { safeRequest } from './request';

export const getSettings   = () =>
  safeRequest({ method: 'get', url: '/settings' });

export const updatePlan    = (plan) =>
  safeRequest({ method: 'put', url: '/settings/plan', data: { plan } });

export const updateApiKey  = (apiKey) =>
  safeRequest({ method: 'put', url: '/settings/api-key', data: { apiKey } });

export const deleteApiKey  = () =>
  safeRequest({ method: 'delete', url: '/settings/api-key' });
