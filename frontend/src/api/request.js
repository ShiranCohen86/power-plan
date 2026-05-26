import axios from 'axios';
import { logDebug, logError } from './logger.js';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

export const httpClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  timeout: 30000,
});

// ---- Request interceptor: attach JWT ----
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    logDebug('api', '→', config.method?.toUpperCase(), config.url);
    return config;
  },
  (err) => { logError('api', 'request error', err); return Promise.reject(err); },
);

// ---- Token refresh machinery ----
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  failedQueue = [];
}

// ---- Response interceptor: auto-refresh on 401, then redirect ----
httpClient.interceptors.response.use(
  (response) => {
    logDebug('api', '←', response.status, response.config.url);
    return response;
  },
  async (responseError) => {
    const status      = responseError.response?.status;
    const originalReq = responseError.config;
    const url         = originalReq?.url;
    const apiMessage  = responseError.response?.data?.error || responseError.message;

    if (
      status === 401 &&
      !originalReq._retry &&
      !url?.includes('/auth/refresh') &&
      location.pathname !== '/login'
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalReq.headers.Authorization = `Bearer ${newToken}`;
          return httpClient(originalReq);
        }).catch((err) => Promise.reject(err));
      }

      originalReq._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(responseError);
        localStorage.removeItem('token');
        location.href = '/login';
        return Promise.reject(responseError);
      }

      try {
        const { data } = await axios.post(`${apiBaseUrl}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        processQueue(null, data.accessToken);
        originalReq.headers.Authorization = `Bearer ${data.accessToken}`;
        return httpClient(originalReq);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    logError('api', '✖', status || 'NETWORK', url, apiMessage);
    return Promise.reject(responseError);
  },
);

export async function safeRequest(configOrPromise) {
  try {
    const isPromise = configOrPromise != null && typeof configOrPromise.then === 'function';
    const response = await (isPromise ? configOrPromise : httpClient(configOrPromise));
    return response.data;
  } catch (rawError) {
    const status = rawError.response?.status;
    const message = rawError.response?.data?.error || rawError.message || 'Request failed';
    const wrappedError = new Error(message);
    wrappedError.status = status;
    wrappedError.payload = rawError.response?.data;
    throw wrappedError;
  }
}
