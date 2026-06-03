const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl             = require('../controllers/notifications.controller');

router.use(authenticate);

router.get  ('/',           ctrl.list);
router.patch ('/:id/read',  ctrl.markRead);
router.patch ('/read-all',  ctrl.markAllRead);
router.delete('/:id',       ctrl.dismiss);

module.exports = router;
