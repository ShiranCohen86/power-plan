const Joi = require('joi');

// Min 8 chars, at least one digit or special character
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[0-9!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]/, 'number or special character');

// tlds: false disables IANA list; the pattern enforces at least one dot in the domain (blocks user@localhost)
const email = Joi.string().email({ tlds: { allow: false } }).pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/).lowercase().trim();

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

// refresh token is read from httpOnly cookie — no body validation needed
exports.refresh = { body: Joi.object({}) };

exports.requestReset = {
  body: Joi.object({ email: email.required() }),
};

exports.resetPassword = {
  body: Joi.object({ token: Joi.string().required(), newPassword: password.required() }),
};

exports.updateProfile = {
  body: Joi.object({ name: Joi.string().min(2).max(80) }),
};

exports.changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword:     password.required(),
  }),
};

exports.totpVerify = {
  body: Joi.object({
    tempToken: Joi.string().required(),
    token:     Joi.string().length(6).pattern(/^\d{6}$/).required(),
  }),
};
