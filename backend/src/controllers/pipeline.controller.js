const asyncHandler = require('../utils/asyncHandler');
const orchestrator = require('../services/orchestrator.service');
const planningRunner = require('../services/planning-runner.service');
const projectService = require('../services/project.service');
const ApiError = require('../utils/ApiError');
const { emitToProject } = require('../sockets');
const logger = require('../utils/logger');

exports.start = asyncHandler(async (req, res) => {
  await orchestrator.startPipeline(req.params.projectId, req.user.id);
  res.status(202).json({ message: 'Pipeline started' });
});

exports.pause = asyncHandler(async (req, res) => {
  await orchestrator.pausePipeline(req.params.projectId, req.user.id);
  res.json({ message: 'Pipeline paused' });
});

exports.status = asyncHandler(async (req, res) => {
  const data = await orchestrator.getPipelineStatus(req.params.projectId, req.user.id);
  res.json(data);
});

exports.approve = asyncHandler(async (req, res) => {
  const { phaseIndex } = req.body;
  if (phaseIndex == null) throw ApiError.badRequest('phaseIndex required');

  // Ownership check — throws 403 if user doesn't own the project
  await projectService.getById(req.params.projectId, req.user.id);

  await planningRunner.approvePhase(req.params.projectId, Number(phaseIndex));
  res.json({ message: 'Phase approved, pipeline resuming' });
});

exports.retry = asyncHandler(async (req, res) => {
  await orchestrator.retryFromPhase(req.params.projectId, req.user.id);
  res.status(202).json({ message: 'Retrying from failed phase' });
});

exports.rollback = asyncHandler(async (req, res) => {
  const { toPhaseIndex } = req.body;
  await orchestrator.rollbackToPhase(req.params.projectId, req.user.id, Number(toPhaseIndex));
  res.json({ message: 'Rolled back' });
});

exports.refine = asyncHandler(async (req, res) => {
  const { phaseIndex, feedback } = req.body;
  if (phaseIndex == null) throw ApiError.badRequest('phaseIndex required');
  if (!feedback?.trim())  throw ApiError.badRequest('feedback required');

  // Ownership check — throws 403 if user doesn't own the project
  await projectService.getById(req.params.projectId, req.user.id);

  // Respond immediately; refinement runs in background
  res.status(202).json({ message: 'Refinement started' });

  planningRunner.refinePhase(req.params.projectId, Number(phaseIndex), feedback).catch((err) => {
    logger.error('pipeline.controller: refine failed', { projectId: req.params.projectId, error: err.message });
    emitToProject(req.params.projectId, 'pipeline:error', { error: err.message });
  });
});

exports.health = asyncHandler(async (req, res) => {
  const Phase   = require('../models/Phase');
  const Project = require('../models/Project');
  const [running, stuck, queued] = await Promise.all([
    Phase.countDocuments({ status: 'running' }),
    Phase.countDocuments({ status: 'running', updatedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } }),
    Project.countDocuments({ status: 'planning' }),
  ]);
  res.json({ ok: stuck === 0, running, stuck, queued });
});

exports.tokenUsage = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const Phase = require('../models/Phase');
  const phases = await Phase.find({ projectId: req.params.projectId, status: 'completed' })
    .select('type tokensUsed startedAt completedAt').lean();
  const total = phases.reduce((s, p) => s + (p.tokensUsed || 0), 0);
  res.json({ total, phases: phases.map((p) => ({ type: p.type, tokens: p.tokensUsed || 0 })) });
});
