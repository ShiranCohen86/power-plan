import { safeRequest } from './request';

const BASE = '/notifications';

export const getNotifications  = (unreadOnly = false) =>
  safeRequest({ method: 'get', url: BASE, params: unreadOnly ? { unread: 'true' } : {} });

export const markRead     = (id) => safeRequest({ method: 'patch', url: `${BASE}/${id}/read` });
export const markAllRead  = ()   => safeRequest({ method: 'patch', url: `${BASE}/read-all` });
