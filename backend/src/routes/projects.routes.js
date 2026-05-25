const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const projectsController = require('../controllers/projects.controller');
const projectValidator = require('../validators/project.validator');

router.use(authenticate);

router.post('/',    validate(projectValidator.create),  projectsController.create);
router.get('/',                                         projectsController.list);
router.get('/:id',  validate(projectValidator.objectId), projectsController.getOne);

// Discovery chat
router.post('/:id/discovery/next',     validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryNext.body }),     projectsController.discoveryNext);
router.post('/:id/discovery/complete', validate({ params: projectValidator.objectId.params, body: projectValidator.discoveryComplete.body }), projectsController.discoveryComplete);

module.exports = router;
