const asyncHandler    = require('../utils/asyncHandler');
const taskService     = require('../services/task.service');
const projectService  = require('../services/project.service');
const ApiError        = require('../utils/ApiError');
const Phase           = require('../models/Phase');
const Document        = require('../models/Document');
const { extractTasks } = require('../services/ai/task-extractor.service');

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

exports.extract = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  await projectService.getById(projectId, req.user.id);

  const phase = await Phase.findOne({ projectId, type: 'dev_planning', status: 'completed' }).lean();
  if (!phase) throw ApiError.badRequest('dev_planning phase not completed yet');

  const doc = await Document.findOne({ projectId, phaseId: phase._id }).lean();
  if (!doc?.content) throw ApiError.badRequest('dev_planning document not found');

  // Run extraction in background — respond immediately
  extractTasks(projectId, phase._id, doc.content).catch(() => {});
  res.status(202).json({ message: 'extraction started' });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const { status } = req.body;
  if (!status) throw ApiError.badRequest('status required');
  const task = await taskService.updateStatus(req.params.taskId, req.params.projectId, status);
  res.json(task);
});
