const ApiError = require('../utils/ApiError');

const ROLES = { ADMIN: 'admin', CLIENT: 'client' };

function authorize(...allowed) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (allowed.length === 0) return next();
    if (!allowed.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };
}

module.exports = { authorize, ROLES };
