const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/settings.controller');

router.use(authenticate);

router.get ('/',        ctrl.getSettings);
router.put ('/plan',    ctrl.updatePlan);
router.put ('/api-key', ctrl.updateApiKey);
router.delete('/api-key', ctrl.deleteApiKey);

module.exports = router;
