const router = require('express').Router({ mergeParams: true });
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi      = require('joi');
const ctrl     = require('../controllers/tasks.controller');

router.use(authenticate);

const statusBody = {
  body: Joi.object({
    status: Joi.string()
      .valid('backlog','planning','in-progress','review','testing','deployed','blocked')
      .required(),
  }),
};

router.get('/',                                ctrl.list);
router.get('/epics',                           ctrl.epicTree);
router.get('/sprint/:sprintIndex',             ctrl.bySprint);
router.patch('/:taskId/status', validate(statusBody), ctrl.updateStatus);

module.exports = router;
