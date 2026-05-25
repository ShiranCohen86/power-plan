const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const ctrl   = require('../controllers/agents.controller');

router.use(authenticate);
router.get('/logs', ctrl.getLogs);

module.exports = router;
