const router     = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const validate   = require('../middleware/validate');
const rateLimit  = require('express-rate-limit');
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

// Per-user+project rate limit: max 10 starts per hour (prevents spam-clicking)
const startLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.user?.id}:${req.params.projectId}`,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin',
  message: { error: 'יותר מדי הפעלות — נסה שוב בעוד שעה' },
});

// All routes are scoped under /api/projects/:projectId/pipeline
router.post('/start', startLimiter, ctrl.start);
router.post('/pause',   ctrl.pause);
router.get('/status',   ctrl.status);
router.post('/approve', validate(phaseIndexBody), ctrl.approve);
router.post('/refine',  validate(refineBody),     ctrl.refine);

module.exports = router;
