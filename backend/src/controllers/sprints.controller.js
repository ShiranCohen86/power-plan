const asyncHandler    = require('../utils/asyncHandler');
const sprintService   = require('../services/sprint.service');
const projectService  = require('../services/project.service');

exports.list = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const sprints = await sprintService.listByProject(req.params.projectId);
  res.json({ items: sprints });
});

exports.getOne = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const sprint = await sprintService.getOne(req.params.projectId, req.params.sprintIndex);
  res.json(sprint);
});
