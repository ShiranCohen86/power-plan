const router = require('express').Router();

router.use('/auth',     require('./auth.routes'));
router.use('/projects', require('./projects.routes'));

// Pipeline & phases are nested under /projects/:projectId
router.use('/projects/:projectId/pipeline', require('./pipeline.routes'));
router.use('/projects/:projectId/phases',   require('./phases.routes'));
router.use('/projects/:projectId/agents',   require('./agents.routes'));
router.use('/projects/:projectId/tasks',    require('./tasks.routes'));
router.use('/projects/:projectId/sprints',  require('./sprints.routes'));
router.use('/settings',                     require('./settings.routes'));
router.use('/notifications',                require('./notifications.routes'));
router.use('/admin',                        require('./admin.routes'));

module.exports = router;
