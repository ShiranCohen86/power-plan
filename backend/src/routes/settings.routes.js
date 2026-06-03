const router      = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl        = require('../controllers/settings.controller');
const usageCtrl   = require('../controllers/usage.controller');
const publicCtrl  = require('../controllers/public-api.controller');
const compCtrl    = require('../controllers/compliance.controller');

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

// Sprint 131-133: Webhook delivery log + test
router.get   ('/webhook/deliveries',  ctrl.getWebhookDeliveries);
router.post  ('/webhook/test',        ctrl.testWebhook);

// Sprint 134: Slack integration
router.put   ('/slack',               ctrl.updateSlackWebhook);
router.delete('/slack',               ctrl.deleteSlackWebhook);

// Sprint 111: usage dashboard
router.get   ('/usage',               usageCtrl.getMyUsage);

// Sprint 105+119: estimates and free tier
router.get   ('/usage/free-tier',     usageCtrl.checkFreeTierLimit);

// Sprint 95: dashboard stats
router.get   ('/stats',               usageCtrl.getDashboardStats);

// Sprint 137-138: public API keys
router.get   ('/api-keys',            publicCtrl.listApiKeys);
router.post  ('/api-keys',            publicCtrl.createApiKey);
router.delete('/api-keys/:keyId',     publicCtrl.revokeApiKey);

// Sprint 141: GDPR data export
router.get   ('/export/my-data',      compCtrl.exportMyData);

// Sprint 145: privacy summary
router.get   ('/privacy',             compCtrl.getPrivacySummary);

module.exports = router;
