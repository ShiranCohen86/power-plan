import axios from 'axios';
import { logDebug, logError } from './logger.js';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

export const httpClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  timeout: 30000,
});

// Store reference injected by store/index.js to avoid circular imports
let _store = null;
export function injectStore(store) { _store = store; }
export function getAccessToken() { return _store?.getState()?.auth?.accessToken || null; }

// ---- Request interceptor: attach JWT from Redux memory ----
httpClient.interceptors.request.use(
  (config) => {
    const token = _store?.getState()?.auth?.accessToken;
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

      try {
        // Refresh token is in httpOnly cookie — send credentials, no body needed
        const { data } = await axios.post(`${apiBaseUrl}/api/auth/refresh`, {}, { withCredentials: true });
        // Store new token in Redux memory (never localStorage)
        if (_store) {
          const { setAccessToken } = await import('../store/slices/authSlice.js');
          _store.dispatch(setAccessToken(data.accessToken));
        }
        processQueue(null, data.accessToken);
        originalReq.headers.Authorization = `Bearer ${data.accessToken}`;
        return httpClient(originalReq);
      } catch (refreshError) {
        processQueue(refreshError);
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
