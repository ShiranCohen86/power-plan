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
  const refreshToken = req.cookies?.refresh_token;
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

exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const user = await require('../models/User').findById(req.user.id).select('+passwordHash');
  if (!user) throw require('../utils/ApiError').notFound('User not found');
  // Verify password before deletion if account has one
  if (user.passwordHash) {
    if (!password) throw require('../utils/ApiError').badRequest('password required to delete account');
    const ok = await user.verifyPassword(password);
    if (!ok) throw require('../utils/ApiError').unauthorized('Incorrect password');
  }
  // Soft-anonymize: clear PII, keep audit trail
  user.name         = `Deleted User ${user._id.toString().slice(-6)}`;
  user.email        = `deleted-${user._id}@powerplan.deleted`;
  user.passwordHash = undefined;
  user.googleId     = undefined;
  user.sessions     = [];
  user.isActive     = false;
  await user.save();
  clearRefreshCookie(res);
  require('../utils/logger').info('auth: account deleted', { userId: req.user.id });
  res.json({ ok: true });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw require('../utils/ApiError').badRequest('currentPassword and newPassword required');
  if (newPassword.length < 8) throw require('../utils/ApiError').badRequest('New password must be at least 8 characters');
  const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json(result);
});

exports.listSessions = asyncHandler(async (req, res) => {
  const sessions = await authService.listSessions(req.user.id);
  res.json({ sessions });
});

exports.revokeSession = asyncHandler(async (req, res) => {
  const result = await authService.revokeSession(req.user.id, req.params.jtiHash);
  res.json(result);
});

exports.loginHistory = asyncHandler(async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const logs = await AuditLog.find({
    userId: req.user.id,
    action: { $in: ['auth.login', 'auth.login.failed', 'auth.google', 'auth.webauthn', 'auth.totp_login'] },
  }).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ history: logs.map((l) => ({ action: l.action, ip: l.meta?.ip || l.ip, createdAt: l.createdAt })) });
});

exports.totpSetup = asyncHandler(async (req, res) => {
  const result = await authService.setupTotp(req.user.id);
  res.json(result);
});

exports.totpEnable = asyncHandler(async (req, res) => {
  const result = await authService.verifyAndEnableTotp(req.user.id, req.body.token);
  res.json(result);
});

exports.totpDisable = asyncHandler(async (req, res) => {
  const result = await authService.disableTotp(req.user.id, req.body.token);
  res.json(result);
});

// Called after password login when totpEnabled=true — takes the temp token + TOTP code
exports.totpVerify = asyncHandler(async (req, res) => {
  const { tempToken, token } = req.body;
  if (!tempToken || !token) throw require('../utils/ApiError').badRequest('tempToken and token required');
  const tokens = await authService.completeTotpLogin(tempToken, token, getRequestMeta(req));
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ user: tokens.user, accessToken: tokens.accessToken });
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
