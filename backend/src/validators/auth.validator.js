const Joi = require('joi');

const password = Joi.string().min(6).max(128);
const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();

exports.signup = {
  body: Joi.object({
    name:     Joi.string().trim().min(2).max(80).required(),
    email:    email.required(),
    password: password.required(),
  }),
};

exports.login = {
  body: Joi.object({
    email:    email.required(),
    password: Joi.string().required(),
  }),
};

exports.refresh = {
  body: Joi.object({ refreshToken: Joi.string().required() }),
};

exports.requestReset = {
  body: Joi.object({ email: email.required() }),
};

exports.resetPassword = {
  body: Joi.object({ token: Joi.string().required(), newPassword: password.required() }),
};

exports.updateProfile = {
  body: Joi.object({ name: Joi.string().min(2).max(80) }),
};
