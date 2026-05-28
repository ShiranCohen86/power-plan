import { safeRequest } from './request';

const BASE = '/admin';

export const getStats      = ()           => safeRequest({ method: 'get', url: `${BASE}/stats` });
export const getActivity   = (params)    => safeRequest({ method: 'get', url: `${BASE}/activity`, params });
export const getAnalytics = ()        => safeRequest({ method: 'get',    url: `${BASE}/analytics` });
export const getLessons = (params)   => safeRequest({ method: 'get',    url: `${BASE}/lessons`, params });
export const createLesson = (data)   => safeRequest({ method: 'post',   url: `${BASE}/lessons`, data });
export const updateLesson = (id, data) => safeRequest({ method: 'patch', url: `${BASE}/lessons/${id}`, data });
export const deleteLesson = (id)     => safeRequest({ method: 'delete', url: `${BASE}/lessons/${id}` });
