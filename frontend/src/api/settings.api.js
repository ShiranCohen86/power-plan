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

export const getNotifPrefs    = ()      => safeRequest({ method: 'get',    url: '/settings/notification-prefs' });
export const updateNotifPrefs = (prefs) => safeRequest({ method: 'patch',  url: '/settings/notification-prefs', data: prefs });
export const updateWebhookUrl       = (url) => safeRequest({ method: 'put',    url: '/settings/webhook', data: { url } });
export const deleteWebhookUrl       = ()    => safeRequest({ method: 'delete', url: '/settings/webhook' });

// Sprint 131-133: Webhook delivery
export const getWebhookDeliveries   = ()    => safeRequest({ method: 'get',    url: '/settings/webhook/deliveries' });
export const testWebhook            = ()    => safeRequest({ method: 'post',   url: '/settings/webhook/test' });

// Sprint 134: Slack
export const updateSlackWebhook     = (url) => safeRequest({ method: 'put',    url: '/settings/slack', data: { url } });
export const deleteSlackWebhook     = ()    => safeRequest({ method: 'delete', url: '/settings/slack' });

// Sprint 111: usage
export const getUsage               = ()    => safeRequest({ method: 'get',    url: '/settings/usage' });
export const checkFreeTierLimit     = ()    => safeRequest({ method: 'get',    url: '/settings/usage/free-tier' });

// Sprint 95: dashboard stats
export const getDashboardStats      = ()    => safeRequest({ method: 'get',    url: '/settings/stats' });

// Sprint 137-138: public API keys
export const listApiKeys            = ()    => safeRequest({ method: 'get',    url: '/settings/api-keys' });
export const createApiKey           = (name) => safeRequest({ method: 'post',  url: '/settings/api-keys', data: { name } });
export const revokeApiKey           = (id)  => safeRequest({ method: 'delete', url: `/settings/api-keys/${id}` });

// Sprint 141: GDPR export (JSON)
export const exportMyData    = () => `/api/settings/export/my-data`;
// Sprint 143: Full account export (ZIP)
export const exportMyDataZip = () => `/api/settings/export/my-data.zip`;

// Sprint 145: privacy
export const getPrivacySummary      = ()    => safeRequest({ method: 'get',    url: '/settings/privacy' });
