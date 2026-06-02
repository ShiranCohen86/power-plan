import { safeRequest } from './request';

export const getSettings      = () =>
  safeRequest({ method: 'get', url: '/settings' });

export const updatePlan       = (plan) =>
  safeRequest({ method: 'put', url: '/settings/plan', data: { plan } });

export const updateApiKey     = (apiKey) =>
  safeRequest({ method: 'put', url: '/settings/api-key', data: { apiKey } });

export const deleteApiKey     = () =>
  safeRequest({ method: 'delete', url: '/settings/api-key' });

export const updateGithubToken = (token) =>
  safeRequest({ method: 'put', url: '/settings/github-token', data: { token } });

export const deleteGithubToken = () =>
  safeRequest({ method: 'delete', url: '/settings/github-token' });

export const updateRenderToken = (token) =>
  safeRequest({ method: 'put', url: '/settings/render-token', data: { token } });

export const deleteRenderToken = () =>
  safeRequest({ method: 'delete', url: '/settings/render-token' });

export const validateApiKey = (apiKey) =>
  safeRequest({ method: 'post', url: '/settings/validate-key', data: { apiKey } });

export const getRateLimit = () =>
  safeRequest({ method: 'get', url: '/settings/rate-limit' });

export const getNotifPrefs    = ()      => safeRequest({ method: 'get',   url: '/settings/notification-prefs' });
export const updateNotifPrefs = (prefs) => safeRequest({ method: 'patch', url: '/settings/notification-prefs', data: prefs });
