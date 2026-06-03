const router             = require('express').Router();
const { authenticate }   = require('../middleware/auth');
const validate           = require('../middleware/validate');
const ctrl               = require('../controllers/projects.controller');
const extrasCtrl         = require('../controllers/project-extras.controller');
const settingsCtrl       = require('../controllers/project-settings.controller');
const servicesCtrl       = require('../controllers/project-services.controller');
const filesCtrl          = require('../controllers/files.controller');
const commentsCtrl       = require('../controllers/comments.controller');
const projectValidator   = require('../validators/project.validator');
const Joi                = require('joi');

router.use(authenticate);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.post  ('/',    validate(projectValidator.create),   ctrl.create);
router.get   ('/',                                          ctrl.list);
router.get   ('/:id', validate(projectValidator.objectId), ctrl.getOne);
router.delete('/:id',        validate(projectValidator.objectId), ctrl.deleteProject);
router.post  ('/:id/clone',   validate(projectValidator.objectId), ctrl.cloneProject);
router.patch ('/:id/archive',        validate(projectValidator.objectId), ctrl.archiveProject);
router.post  ('/:id/generate-readme', validate(projectValidator.objectId), ctrl.generateReadme);
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

// ── Generated files ───────────────────────────────────────────────────────────
router.get('/:id/files',               validate(projectValidator.objectId), filesCtrl.listFiles);
router.get('/:id/files/download',      validate(projectValidator.objectId), filesCtrl.downloadFiles);
router.get('/:id/files/:filePath(*)',   validate(projectValidator.objectId), filesCtrl.getFileContent);

// ── External service credentials ──────────────────────────────────────────────
router.get  ('/:id/required-services',                            servicesCtrl.getRequiredServices);
router.post ('/:id/required-services/:serviceId/credentials',     servicesCtrl.saveServiceCredentials);
router.patch('/:id/required-services/:serviceId/skip',            servicesCtrl.skipService);
router.post ('/:id/required-services/:serviceId/consult',         servicesCtrl.consultService);

// ── Sprint 92: Tags ───────────────────────────────────────────────────────────
router.patch('/:id/tags',        validate(projectValidator.objectId), extrasCtrl.updateTags);

// ── Sprint 93: Pin ────────────────────────────────────────────────────────────
router.patch('/:id/pin',         validate(projectValidator.objectId), extrasCtrl.togglePin);

// ── Sprint 94: Bulk ops ───────────────────────────────────────────────────────
router.post('/bulk/delete',    extrasCtrl.bulkDelete);
router.post('/bulk/archive',   extrasCtrl.bulkArchive);
// ── Sprint 140: Import from URL ───────────────────────────────────────────────
router.post('/import-from-url', ctrl.importFromUrl);

// ── Sprint 97: Notes ──────────────────────────────────────────────────────────
router.patch('/:id/notes',       validate(projectValidator.objectId), extrasCtrl.updateNotes);

// ── Sprint 117: Token budget ──────────────────────────────────────────────────
router.patch('/:id/token-budget', validate(projectValidator.objectId), extrasCtrl.updateTokenBudget);

// ── Sprint 121-122: Share ─────────────────────────────────────────────────────
router.post  ('/:id/share/enable',     validate(projectValidator.objectId), extrasCtrl.enableShare);
router.post  ('/:id/share/disable',    validate(projectValidator.objectId), extrasCtrl.disableShare);
router.post  ('/:id/share/regenerate', validate(projectValidator.objectId), extrasCtrl.regenerateShareToken);

// ── Sprint 124-126: Collaborators ─────────────────────────────────────────────
router.get   ('/:id/collaborators',             validate(projectValidator.objectId), extrasCtrl.listCollaborators);
router.post  ('/:id/collaborators',             validate(projectValidator.objectId), extrasCtrl.inviteCollaborator);
router.patch ('/:id/collaborators/:collabId',   validate(projectValidator.objectId), extrasCtrl.updateCollaboratorRole);
router.delete('/:id/collaborators/:collabId',   validate(projectValidator.objectId), extrasCtrl.revokeCollaborator);

// ── Sprint 127: Phase comments ────────────────────────────────────────────────
router.get   ('/:id/phases/:phaseIndex/comments',           validate(projectValidator.objectId), commentsCtrl.listComments);
router.post  ('/:id/phases/:phaseIndex/comments',           validate(projectValidator.objectId), commentsCtrl.addComment);
router.delete('/:id/phases/:phaseIndex/comments/:commentId', validate(projectValidator.objectId), commentsCtrl.deleteComment);

// ── Sprint 130: Transfer ──────────────────────────────────────────────────────
router.post('/:id/transfer',      validate(projectValidator.objectId), extrasCtrl.transferProject);

// ── Sprint 136: Custom env vars ───────────────────────────────────────────────
router.patch('/:id/custom-env',   validate(projectValidator.objectId), extrasCtrl.updateCustomEnvVars);

module.exports = router;
