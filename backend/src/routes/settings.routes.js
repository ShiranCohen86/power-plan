const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/settings.controller');

router.use(authenticate);

router.get  ('/',              ctrl.getSettings);
router.get  ('/rate-limit',    ctrl.getRateLimit);
router.put  ('/plan',          ctrl.updatePlan);
router.put  ('/api-key',       ctrl.updateApiKey);
router.delete('/api-key',     ctrl.deleteApiKey);
router.post ('/validate-key',  ctrl.validateApiKey);
router.put ('/github-token',  ctrl.updateGithubToken);
router.delete('/github-token',ctrl.deleteGithubToken);
router.put ('/render-token',  ctrl.updateRenderToken);
router.delete('/render-token',ctrl.deleteRenderToken);
router.get   ('/notification-prefs',  ctrl.getNotifPrefs);
router.patch ('/notification-prefs',  ctrl.updateNotifPrefs);
router.put   ('/webhook',             ctrl.updateWebhookUrl);
router.delete('/webhook',             ctrl.deleteWebhookUrl);

module.exports = router;
