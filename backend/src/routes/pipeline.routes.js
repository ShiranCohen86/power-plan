const router     = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const validate   = require('../middleware/validate');
const Joi        = require('joi');
const ctrl       = require('../controllers/pipeline.controller');

router.use(authenticate);

const phaseIndexBody = {
  body: Joi.object({ phaseIndex: Joi.number().integer().min(0).required() }),
};
const refineBody = {
  body: Joi.object({
    phaseIndex: Joi.number().integer().min(0).required(),
    feedback:   Joi.string().min(5).max(1000).required(),
  }),
};

// All routes are scoped under /api/projects/:projectId/pipeline
router.post('/start',   ctrl.start);
router.post('/pause',   ctrl.pause);
router.get('/status',   ctrl.status);
router.post('/approve', validate(phaseIndexBody), ctrl.approve);
router.post('/refine',  validate(refineBody),     ctrl.refine);

module.exports = router;
