const SENSITIVE_KEYS = new Set([
  'password', 'currentPassword', 'newPassword', 'passwordHash',
  'apiKey', 'token', 'secret', 'refreshToken', 'tempToken', 'totpSecret',
]);

// Recursively strip HTML tags from string values in request body
function stripTags(val) {
  if (typeof val === 'string') return val.replace(/<[^>]*>/g, '');
  if (Array.isArray(val)) return val.map(stripTags);
  if (val && typeof val === 'object') {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, stripTags(v)]));
  }
  return val;
}

// Mask sensitive fields in objects before logging
function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v]),
  );
}

const sanitizeBody = function (req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = stripTags(req.body);
  next();
};

sanitizeBody.maskSensitive = maskSensitive;
module.exports = sanitizeBody;
