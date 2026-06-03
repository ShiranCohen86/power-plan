import { safeRequest } from './request';

const BASE = '/admin';

export const getStats      = ()           => safeRequest({ method: 'get', url: `${BASE}/stats` });
export const getActivity   = (params)    => safeRequest({ method: 'get', url: `${BASE}/activity`, params });
export const getAnalytics = ()        => safeRequest({ method: 'get',    url: `${BASE}/analytics` });
export const getLessons = (params)   => safeRequest({ method: 'get',    url: `${BASE}/lessons`, params });
export const createLesson = (data)   => safeRequest({ method: 'post',   url: `${BASE}/lessons`, data });
export const updateLesson = (id, data) => safeRequest({ method: 'patch', url: `${BASE}/lessons/${id}`, data });
export const deleteLesson    = (id)      => safeRequest({ method: 'delete', url: `${BASE}/lessons/${id}` });
export const bulkDeleteLessons = (data)  => safeRequest({ method: 'delete', url: `${BASE}/lessons/bulk`, data });
export const listUsers     = (params)   => safeRequest({ method: 'get',    url: `${BASE}/users`, params });
export const updateUser    = (id, data) => safeRequest({ method: 'patch',  url: `${BASE}/users/${id}`, data });
export const impersonateUser = (id)     => safeRequest({ method: 'post',   url: `${BASE}/users/${id}/impersonate` });
export const exportLogs        = (params)   => `${import.meta.env.VITE_API_URL || ''}/api/admin/logs/export${params?.projectId ? `?projectId=${params.projectId}` : ''}`;
export const getSystemHealth   = ()         => safeRequest({ method: 'get', url: `${BASE}/system/health` });
export const getReadiness      = ()         => safeRequest({ method: 'get', url: `${BASE}/system/readiness` });
export const getAllUsersUsage   = ()         => safeRequest({ method: 'get', url: `${BASE}/usage` });
export const exportAuditLogCsv = (params)   => `${import.meta.env.VITE_API_URL || ''}/api/admin/audit/export${params?.from ? `?from=${params.from}` : ''}`;
