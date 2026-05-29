const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const env = require('../config/env');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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

  if (user.lockUntil && user.lockUntil > new Date()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw ApiError.tooManyRequests(`חשבון נעול. נסה שוב בעוד ${mins} דקות`);
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();
    AuditLog.create({ userId: user._id, action: 'auth.login.failed', ip, userAgent, meta: { email } }).catch(() => {});
    throw ApiError.unauthorized('Invalid credentials');
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;

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

// ── Google OAuth ───────────────────────────────────────────────────────────

async function loginWithGoogle(token, { ip, userAgent } = {}) {
  if (!env.GOOGLE_CLIENT_ID) throw ApiError.badRequest('Google OAuth not configured');

  let googleId, email, name, avatar;

  if (token.split('.').length === 3) {
    // id_token (JWT) — verify with Google's public keys
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: env.GOOGLE_CLIENT_ID });
    ({ sub: googleId, email, name, picture: avatar } = ticket.getPayload());
  } else {
    // access_token — fetch userinfo from Google
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw ApiError.unauthorized('Invalid Google access token');
    ({ sub: googleId, email, name, picture: avatar } = await res.json());
  }
  if (!email) throw ApiError.badRequest('Google account has no email');

  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      if (!user.authMethods.includes('google')) user.authMethods.push('google');
    }
    if (avatar && !user.avatar) user.avatar = avatar;
  } else {
    user = new User({
      name:        name || email.split('@')[0],
      email:       email.toLowerCase(),
      googleId,
      avatar,
      authMethods: ['google'],
    });
  }

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent: userAgent || '', ip: ip || '' });
  user.lastLogin = new Date();
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.google', ip, userAgent, meta: { email } }).catch(() => {});
  return { user: user.toJSON(), accessToken, refreshToken };
}

// ── WebAuthn: Registration ─────────────────────────────────────────────────

async function generateWebAuthnRegistration(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const options = await generateRegistrationOptions({
    rpName:       env.WEBAUTHN_RP_NAME,
    rpID:         env.WEBAUTHN_RP_ID,
    userName:     user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey:             'preferred',
      userVerification:        'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: user.webAuthnCredentials.map((c) => ({
      id:         c.credentialID,
      type:       'public-key',
      transports: c.transports,
    })),
  });

  await User.findByIdAndUpdate(userId, { webAuthnChallenge: options.challenge });
  return options;
}

async function verifyWebAuthnRegistration(userId, registrationResponse) {
  const user = await User.findById(userId).select('+webAuthnChallenge');
  if (!user || !user.webAuthnChallenge) throw ApiError.badRequest('No pending registration challenge');

  const origin = env.NODE_ENV === 'production'
    ? env.FRONTEND_URL
    : 'http://localhost:5173';

  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response:          registrationResponse,
    expectedChallenge: user.webAuthnChallenge,
    expectedOrigin:    origin,
    expectedRPID:      env.WEBAUTHN_RP_ID,
  });

  if (!verified || !registrationInfo) throw ApiError.badRequest('Biometric registration failed');

  const { credential } = registrationInfo;
  const newCred = {
    credentialID: credential.id,
    publicKey:    Buffer.from(credential.publicKey).toString('base64url'),
    counter:      credential.counter,
    deviceType:   registrationInfo.credentialDeviceType,
    backedUp:     registrationInfo.credentialBackedUp,
    transports:   registrationResponse.response?.transports || [],
  };

  user.webAuthnCredentials.push(newCred);
  if (!user.authMethods.includes('webauthn')) user.authMethods.push('webauthn');
  user.webAuthnChallenge = undefined;
  await user.save();

  return { verified: true };
}

// ── WebAuthn: Authentication ───────────────────────────────────────────────

async function generateWebAuthnAuthentication(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.webAuthnCredentials.length) {
    throw ApiError.badRequest('No biometric credentials registered for this account');
  }

  const options = await generateAuthenticationOptions({
    rpID:             env.WEBAUTHN_RP_ID,
    userVerification: 'preferred',
    allowCredentials: user.webAuthnCredentials.map((c) => ({
      id:         c.credentialID,
      type:       'public-key',
      transports: c.transports,
    })),
  });

  await User.findByIdAndUpdate(user._id, { webAuthnChallenge: options.challenge });
  return options;
}

async function verifyWebAuthnAuthentication(email, authResponse) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+webAuthnChallenge');
  if (!user || !user.webAuthnChallenge) throw ApiError.badRequest('No pending authentication challenge');

  const storedCred = user.webAuthnCredentials.find((c) => c.credentialID === authResponse.id);
  if (!storedCred) throw ApiError.badRequest('Unknown credential');

  const origin = env.NODE_ENV === 'production'
    ? env.FRONTEND_URL
    : 'http://localhost:5173';

  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response:          authResponse,
    expectedChallenge: user.webAuthnChallenge,
    expectedOrigin:    origin,
    expectedRPID:      env.WEBAUTHN_RP_ID,
    credential: {
      id:         storedCred.credentialID,
      publicKey:  Buffer.from(storedCred.publicKey, 'base64url'),
      counter:    storedCred.counter,
      transports: storedCred.transports,
    },
  });

  if (!verified) throw ApiError.unauthorized('Biometric verification failed');

  storedCred.counter = authenticationInfo.newCounter;
  user.webAuthnChallenge = undefined;
  user.lastLogin = new Date();

  const { accessToken, refreshToken, jtiHash } = signTokens(user);
  pushSession(user, { jtiHash, userAgent: '', ip: '' });
  await user.save();

  AuditLog.create({ userId: user._id, action: 'auth.webauthn' }).catch(() => {});
  return { user: user.toJSON(), accessToken, refreshToken };
}

module.exports = {
  signTokens, signup, login, refresh,
  requestPasswordReset, resetPassword,
  getProfile, updateProfile, logout, listUsers,
  loginWithGoogle,
  generateWebAuthnRegistration, verifyWebAuthnRegistration,
  generateWebAuthnAuthentication, verifyWebAuthnAuthentication,
};
