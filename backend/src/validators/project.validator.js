const Joi = require('joi');

exports.create = {
  body: Joi.object({
    title: Joi.string().trim().min(2).max(100).required(),
    idea:  Joi.string().trim().min(10).max(2000).required(),
  }),
};

exports.discoveryNext = {
  body: Joi.object({
    answers: Joi.array().items(
      Joi.object({
        question: Joi.string().required(),
        answer:   Joi.string().required(),
      }),
    ).required(),
  }),
};

exports.discoveryComplete = {
  body: Joi.object({
    answers: Joi.array().items(
      Joi.object({
        question: Joi.string().required(),
        answer:   Joi.string().required(),
      }),
    ).min(1).required(),
  }),
};

exports.objectId = {
  params: Joi.object({ id: Joi.string().hex().length(24).required() }),
};
