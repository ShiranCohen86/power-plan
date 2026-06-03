const router     = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const validate   = require('../middleware/validate');
const rateLimit  = require('express-rate-limit');
const Joi        = require('joi');
const ctrl       = require('../controllers/pipeline.controller');
const extrasCtrl = require('../controllers/phase-extras.controller');

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
  limit: 10,
  keyGenerator: (req) => `${req.user?.id}:${req.params.projectId}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.user?.role === 'admin',
  message: { error: 'Too many pipeline starts — try again in an hour' },
});

const rollbackBody = {
  body: Joi.object({ toPhaseIndex: Joi.number().integer().min(0).required() }),
};

// All routes are scoped under /api/projects/:projectId/pipeline
router.post('/start',    startLimiter,              ctrl.start);
router.post('/pause',                               ctrl.pause);
router.get('/status',                               ctrl.status);
router.post('/approve',  validate(phaseIndexBody),  ctrl.approve);
router.post('/refine',   validate(refineBody),      ctrl.refine);
router.post('/retry',                               ctrl.retry);
router.post('/rollback', validate(rollbackBody),    ctrl.rollback);
router.get ('/health',                              ctrl.health);
router.get ('/tokens',                              ctrl.tokenUsage);

// Sprint 101: rate a phase output
router.post('/rate',     validate({ body: Joi.object({ phaseIndex: Joi.number().integer().min(0).required(), rating: Joi.number().valid(1, 2).required() }) }), extrasCtrl.ratePhase);
// Sprint 102: phase revision history
router.get ('/phases/:phaseIndex/history',          extrasCtrl.getPhaseHistory);
// Sprint 104: approve all awaiting phases
router.post('/approve-all',                         extrasCtrl.approveAll);
// Sprint 105: cost estimate
router.get ('/estimate/cost',                       extrasCtrl.getCostEstimate);  // proxied from usage controller
// Sprint 106: time estimate
router.get ('/estimate/time',                       extrasCtrl.getTimeEstimate);
// Sprint 107: meeting transcript
router.get ('/phases/:phaseIndex/transcript',       extrasCtrl.getMeetingTranscript);
// Sprint 109: custom pause points
router.patch('/pause-points', validate({ body: Joi.object({ pauseBeforePhases: Joi.array().items(Joi.number().integer().min(0).max(18)).required() }) }), extrasCtrl.updatePausePoints);
// Sprint 110: phase content search
router.get ('/search',                              extrasCtrl.searchPhases);

module.exports = router;
