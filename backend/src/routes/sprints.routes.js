const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const ctrl   = require('../controllers/sprints.controller');

router.use(authenticate);

router.get('/',          ctrl.list);
router.get('/:sprintIndex', ctrl.getOne);

module.exports = router;
