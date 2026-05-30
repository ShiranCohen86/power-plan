const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const env = require('../config/env');

function clientIp(req) {
  return (req.ip || '').replace(/^::ffff:/, '');
}

function getRequestMeta(req) {
  return { userAgent: req.headers['user-agent'] || '', ip: clientIp(req) };
}

function stripRefreshToken(result) {
  const { refreshToken: _, ...safe } = result;
  return safe;
}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  path: '/api/auth/refresh',
};

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
}

exports.signup = asyncHandler(async (req, res) => {
  const result = await authService.signup({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    ...getRequestMeta(req),
  });
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json(stripRefreshToken(result));
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login({ ...req.body, ...getRequestMeta(req) });
  setRefreshCookie(res, result.refreshToken);
  res.json(stripRefreshToken(result));
});

exports.refresh = asyncHandler(async (req, res) => {
  // Accept from httpOnly cookie first, fall back to body for backward compat
  const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;
  const tokens = await authService.refresh(refreshToken);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
});

exports.logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  clearRefreshCookie(res);
  res.json({ ok: true });
});

exports.me = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  res.json(profile);
});

exports.updateMe = asyncHandler(async (req, res) => {
  const profile = await authService.updateProfile(req.user.id, req.body);
  res.json(profile);
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(result);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
});

exports.listUsers = asyncHandler(async (req, res) => {
  const users = await authService.listUsers(req.query);
  res.json({ items: users });
});

// ── Google OAuth ───────────────────────────────────────────────────────────

exports.googleLogin = asyncHandler(async (req, res) => {
  const result = await authService.loginWithGoogle(req.body.idToken, getRequestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  res.json(stripRefreshToken(result));
});

// ── WebAuthn ───────────────────────────────────────────────────────────────

exports.webAuthnRegisterStart = asyncHandler(async (req, res) => {
  const options = await authService.generateWebAuthnRegistration(req.user.id);
  res.json(options);
});

exports.webAuthnRegisterFinish = asyncHandler(async (req, res) => {
  const result = await authService.verifyWebAuthnRegistration(req.user.id, req.body);
  res.json(result);
});

exports.webAuthnLoginStart = asyncHandler(async (req, res) => {
  const options = await authService.generateWebAuthnAuthentication(req.body.email);
  res.json(options);
});

exports.webAuthnLoginFinish = asyncHandler(async (req, res) => {
  const result = await authService.verifyWebAuthnAuthentication(req.body.email, req.body.response);
  setRefreshCookie(res, result.refreshToken);
  res.json(stripRefreshToken(result));
});
