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

// Silent refresh using the httpOnly cookie — no body needed
export function silentRefresh() {
  return safeRequest({ method: 'post', url: '/auth/refresh', withCredentials: true });
}

export function requestPasswordReset(email) {
  return safeRequest(httpClient.post('/auth/password/forgot', { email }));
}

export function resetPasswordWithToken(payload) {
  return safeRequest(httpClient.post('/auth/password/reset', payload));
}

// Google OAuth
export function googleLoginRequest(idToken) {
  return safeRequest(httpClient.post('/auth/google', { idToken }));
}

// WebAuthn / Passkeys
export function webAuthnRegisterStart() {
  return safeRequest(httpClient.post('/auth/webauthn/register/start'));
}
export function webAuthnRegisterFinish(response) {
  return safeRequest(httpClient.post('/auth/webauthn/register/finish', response));
}
export function webAuthnLoginStart(email) {
  return safeRequest(httpClient.post('/auth/webauthn/login/start', { email }));
}
export function webAuthnLoginFinish(email, response) {
  return safeRequest(httpClient.post('/auth/webauthn/login/finish', { email, response }));
}

// Sessions
export const getSessions    = ()          => safeRequest({ method: 'get',    url: '/auth/sessions' });
export const revokeSession  = (jtiHash)   => safeRequest({ method: 'delete', url: `/auth/sessions/${jtiHash}` });

// TOTP 2FA
export const totpSetup      = ()          => safeRequest({ method: 'post',   url: '/auth/totp/setup' });
export const totpEnable     = (token)     => safeRequest({ method: 'post',   url: '/auth/totp/enable', data: { token } });
export const totpDisable    = (token)     => safeRequest({ method: 'delete', url: '/auth/totp', data: { token } });
