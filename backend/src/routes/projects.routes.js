const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const projectsController = require('../controllers/projects.controller');
const projectValidator = require('../validators/project.validator');

router.use(authenticate);

router.post  ('/',    validate(projectValidator.create),   projectsController.create);
router.get   ('/',                                          projectsController.list);
router.get   ('/:id', validate(projectValidator.objectId), projectsController.getOne);
router.delete('/:id', validate(projectValidator.objectId), projectsController.deleteProject);

// Discovery chat
router.post ('/:id/discovery/next',     validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryNext.body }),     projectsController.discoveryNext);
router.post ('/:id/discovery/complete', validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryComplete.body }), projectsController.discoveryComplete);
router.patch('/:id/discovery-progress', validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryComplete.body }), projectsController.discoveryProgress);

// Meeting history
router.get('/:id/meetings', validate(projectValidator.objectId), projectsController.getMeetings);

// Dynamic service credentials
router.get  ('/:id/required-services',                                    projectsController.getRequiredServices);
router.post ('/:id/required-services/:serviceId/credentials',             projectsController.saveServiceCredentials);
router.patch('/:id/required-services/:serviceId/skip',                    projectsController.skipService);
router.post ('/:id/required-services/:serviceId/consult',                 projectsController.consultService);

// Per-project settings
router.get   ('/:id/settings',              projectsController.getProjectSettings);
router.put   ('/:id/settings/api-key',      projectsController.setProjectApiKey);
router.delete('/:id/settings/api-key',      projectsController.deleteProjectApiKey);
router.put   ('/:id/settings/github-token', projectsController.setProjectGithubToken);
router.delete('/:id/settings/github-token', projectsController.deleteProjectGithubToken);
router.put   ('/:id/settings/render-token', projectsController.setProjectRenderToken);
router.delete('/:id/settings/render-token', projectsController.deleteProjectRenderToken);

module.exports = router;
