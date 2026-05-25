const asyncHandler   = require('../utils/asyncHandler');
const taskService    = require('../services/task.service');
const projectService = require('../services/project.service');
const ApiError       = require('../utils/ApiError');

exports.epicTree = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const tree = await taskService.getEpicTree(req.params.projectId);
  res.json({ items: tree });
});

exports.list = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const tasks = await taskService.listByProject(req.params.projectId);
  res.json({ items: tasks });
});

exports.bySprint = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const tasks = await taskService.listBySprint(req.params.projectId, Number(req.params.sprintIndex));
  res.json({ items: tasks });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const { status } = req.body;
  if (!status) throw ApiError.badRequest('status required');
  const task = await taskService.updateStatus(req.params.taskId, req.params.projectId, status);
  res.json(task);
});
