const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// Short-lived in-memory cache to avoid a DB hit on every request.
// User records are cached for 30 seconds; role/isActive changes propagate within that window.
const USER_CACHE_TTL_MS = 30_000;
const userCache = new Map(); // userId → { user, expiresAt }

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { userCache.delete(userId); return null; }
  return entry.user;
}

function setCachedUser(userId, user) {
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  // Evict stale entries when cache grows large to prevent unbounded memory use
  if (userCache.size > 1000) {
    const now = Date.now();
    for (const [id, entry] of userCache) {
      if (now > entry.expiresAt) userCache.delete(id);
    }
  }
}

// Exported so other services (e.g. after user update) can invalidate immediately
function invalidateUserCache(userId) {
  userCache.delete(String(userId));
}

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw ApiError.unauthorized('Missing token');
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET);
    const userId = String(payload.sub);

    let user = getCachedUser(userId);
    if (!user) {
      user = await User.findById(userId).lean();
      if (user) setCachedUser(userId, user);
    }

    if (!user || !user.isActive) throw ApiError.unauthorized('Invalid user');
    req.user = { id: userId, role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Invalid or expired token'));
    }
    next(err);
  }
}

module.exports = { authenticate, invalidateUserCache };
