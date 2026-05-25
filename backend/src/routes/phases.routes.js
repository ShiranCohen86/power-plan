const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const ctrl   = require('../controllers/phases.controller');

router.use(authenticate);

router.get('/',                        ctrl.list);
router.get('/:phaseIndex/document',    ctrl.getDocument);

module.exports = router;
