const express           = require('express');
const router            = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize }    = require('../middleware/rbac');
const ctrl             = require('../controllers/admin.controller');

router.use(authenticate, authorize('admin'));

router.get   ('/setup-status',   ctrl.platformSetupStatus);
router.get   ('/stats',          ctrl.platformStats);
router.get   ('/analytics',      ctrl.getAnalytics);
router.get   ('/activity',       ctrl.getActivity);
router.get   ('/lessons',        ctrl.listLessons);
router.post  ('/lessons',        ctrl.createLesson);
router.patch ('/lessons/:id',    ctrl.updateLesson);
router.delete('/lessons/:id',    ctrl.deleteLesson);

module.exports = router;
