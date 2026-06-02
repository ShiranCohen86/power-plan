// Recursively strip HTML tags from string values in request body
function stripTags(val) {
  if (typeof val === 'string') return val.replace(/<[^>]*>/g, '');
  if (Array.isArray(val)) return val.map(stripTags);
  if (val && typeof val === 'object') {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, stripTags(v)]));
  }
  return val;
}

module.exports = function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = stripTags(req.body);
  next();
};
