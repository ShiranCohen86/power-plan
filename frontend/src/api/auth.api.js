import { httpClient, safeRequest } from './request.js';

export function signupRequest(data) {
  return safeRequest(httpClient.post('/auth/signup', data));
}

export function loginRequest(credentials) {
  return safeRequest(httpClient.post('/auth/login', credentials));
}

export function fetchCurrentUser() {
  return safeRequest(httpClient.get('/auth/me'));
}

export function updateCurrentUser(patch) {
  return safeRequest(httpClient.patch('/auth/me', patch));
}

export function logoutRequest() {
  return safeRequest(httpClient.post('/auth/logout'));
}

export function refreshTokens(refreshToken) {
  return safeRequest(httpClient.post('/auth/refresh', { refreshToken }));
}

export function requestPasswordReset(email) {
  return safeRequest(httpClient.post('/auth/password/forgot', { email }));
}

export function resetPasswordWithToken(payload) {
  return safeRequest(httpClient.post('/auth/password/reset', payload));
}
