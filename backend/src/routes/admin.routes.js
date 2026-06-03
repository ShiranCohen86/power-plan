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

// User management
router.get   ('/users',          ctrl.listUsers);
router.patch ('/users/:id',      ctrl.updateUser);

// Agent log export
router.get   ('/logs/export',        ctrl.exportAgentLogs);

// Impersonation
router.post  ('/users/:id/impersonate', ctrl.impersonateUser);

// Bulk lesson operations
router.delete('/lessons/bulk',          ctrl.bulkDeleteLessons);

// Audit log
router.get   ('/audit',                 ctrl.getAuditLog);

module.exports = router;
