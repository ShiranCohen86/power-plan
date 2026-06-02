const router             = require('express').Router();
const { authenticate }   = require('../middleware/auth');
const validate           = require('../middleware/validate');
const ctrl               = require('../controllers/projects.controller');
const settingsCtrl       = require('../controllers/project-settings.controller');
const servicesCtrl       = require('../controllers/project-services.controller');
const projectValidator   = require('../validators/project.validator');

router.use(authenticate);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.post  ('/',    validate(projectValidator.create),   ctrl.create);
router.get   ('/',                                          ctrl.list);
router.get   ('/:id', validate(projectValidator.objectId), ctrl.getOne);
router.delete('/:id', validate(projectValidator.objectId), ctrl.deleteProject);
router.patch ('/:id/restore', validate(projectValidator.objectId), ctrl.restoreProject);

// ── Discovery ─────────────────────────────────────────────────────────────────
router.post ('/:id/discovery/next',
  validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryNext.body }),
  ctrl.discoveryNext);
router.post ('/:id/discovery/complete',
  validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryComplete.body }),
  ctrl.discoveryComplete);
router.patch('/:id/discovery-progress',
  validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryComplete.body }),
  ctrl.discoveryProgress);

// ── Meetings ──────────────────────────────────────────────────────────────────
router.get('/:id/meetings', validate(projectValidator.objectId), ctrl.getMeetings);

// ── Per-project settings ──────────────────────────────────────────────────────
router.get   ('/:id/settings',              validate(projectValidator.objectId), settingsCtrl.getProjectSettings);
router.put   ('/:id/settings/api-key',      validate(projectValidator.objectId), settingsCtrl.setProjectApiKey);
router.delete('/:id/settings/api-key',      validate(projectValidator.objectId), settingsCtrl.deleteProjectApiKey);
router.put   ('/:id/settings/github-token', validate(projectValidator.objectId), settingsCtrl.setProjectGithubToken);
router.delete('/:id/settings/github-token', validate(projectValidator.objectId), settingsCtrl.deleteProjectGithubToken);
router.put   ('/:id/settings/render-token', validate(projectValidator.objectId), settingsCtrl.setProjectRenderToken);
router.delete('/:id/settings/render-token', validate(projectValidator.objectId), settingsCtrl.deleteProjectRenderToken);

// ── External service credentials ──────────────────────────────────────────────
router.get  ('/:id/required-services',                            servicesCtrl.getRequiredServices);
router.post ('/:id/required-services/:serviceId/credentials',     servicesCtrl.saveServiceCredentials);
router.patch('/:id/required-services/:serviceId/skip',            servicesCtrl.skipService);
router.post ('/:id/required-services/:serviceId/consult',         servicesCtrl.consultService);

module.exports = router;
