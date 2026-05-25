const ApiError = require('../utils/ApiError');

module.exports = function validate(schema) {
  return (req, _res, next) => {
    for (const key of ['body', 'query', 'params']) {
      if (!schema[key]) continue;
      const { value, error } = schema[key].validate(req[key], { abortEarly: false, stripUnknown: true });
      if (error) {
        return next(
          ApiError.badRequest(
            'Validation failed',
            error.details.map((d) => ({ path: d.path.join('.'), message: d.message })),
          ),
        );
      }
      req[key] = value;
    }
    next();
  };
};
