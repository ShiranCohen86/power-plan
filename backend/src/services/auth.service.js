const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// ── Token helpers ──────────────────────────────────────────────────────────

function hashJti(jti) {
  return crypto.createHash('sha256').update(jti).digest('hex');
}

function signTokens(user) {
  const payload = { sub: String(user._id), role: user.role };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  const jti = crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken, jtiHash: hashJti(jti) };
}

function pushSession(user, { jtiHash, userAgent, ip }) {
  user.sessions.push({ jtiHash, userAgent, ip, lastSeen: new Date() });
  if (user.sessions.length > 5) user.sessions = user.sessions.slice(-5);
}

// ── Signup ─────────────────────────────────────────────────────────────────

async function signup({ name, email, password, userAgent, ip }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email already in use');

  const user = new User({ name: name.trim(), email: email.toLowerCase(), role: 'client', isActive: true });
  await user.setPassword(password);
  await user.save();

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent, ip });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.signup', ip, userAgent, meta: { email, name } }).catch(() => {});
  return { user: user.toJSON(), accessToken, refreshToken };
}

// ── Login ──────────────────────────────────────────────────────────────────

async function login({ email, password, userAgent, ip }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user || !user.isActive) {
    AuditLog.create({ action: 'auth.login.failed', ip, userAgent, meta: { email } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    AuditLog.create({ userId: user._id, action: 'auth.login.failed', ip, userAgent, meta: { email } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent, ip });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.login', ip, userAgent, meta: { email: user.email } }).catch(() => {});
  return { user: user.toJSON(), accessToken, refreshToken };
}

// ── Refresh (with rotation) ────────────────────────────────────────────────

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (jwtError) {
    logger.warn('JWT refresh token verification failed', { message: jwtError.message });
    throw ApiError.unauthorized('Invalid refresh token');
  }

  if (!payload.jti) throw ApiError.unauthorized('Invalid refresh token format');

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized();

  const jtiHash = hashJti(payload.jti);
  const sessionIdx = user.sessions.findIndex((s) => s.jtiHash === jtiHash);
  if (sessionIdx === -1) throw ApiError.unauthorized('Refresh token revoked or already used');

  const oldSession = user.sessions[sessionIdx];
  user.sessions.splice(sessionIdx, 1);

  const { accessToken, refreshToken: newRefresh, jtiHash: newJtiHash } = signTokens(user);
  pushSession(user, { jtiHash: newJtiHash, userAgent: oldSession.userAgent, ip: oldSession.ip });
  await user.save();

  return { accessToken, refreshToken: newRefresh };
}

// ── Password reset ─────────────────────────────────────────────────────────

async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return { ok: true };

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  return { ok: true, devToken: env.RETURN_DEV_TOKEN ? rawToken : undefined };
}

async function resetPassword({ token, newPassword }) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetToken +passwordResetExpires');

  if (!user) throw ApiError.badRequest('Invalid or expired reset token');
  await user.setPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.sessions = [];
  await user.save();
  return { ok: true };
}

// ── Profile ────────────────────────────────────────────────────────────────

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

async function updateProfile(userId, patch) {
  const allowed = ['name'];
  const update = {};
  for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];
  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

// ── Logout ─────────────────────────────────────────────────────────────────

async function logout(userId) {
  await User.updateOne({ _id: userId }, { $set: { sessions: [] } });
  AuditLog.create({ userId, action: 'auth.logout' }).catch(() => {});
  return { ok: true };
}

// ── Admin: list users ──────────────────────────────────────────────────────

async function listUsers(query) {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.q) {
    const { escapeRegex } = require('../utils/pagination');
    const safe = escapeRegex(query.q);
    filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }];
  }
  const users = await User.find(filter).limit(200).sort('-createdAt');
  return users.map((u) => u.toJSON());
}

module.exports = { signTokens, signup, login, refresh, requestPasswordReset, resetPassword, getProfile, updateProfile, logout, listUsers };
