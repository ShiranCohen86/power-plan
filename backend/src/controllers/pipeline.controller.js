const asyncHandler = require('../utils/asyncHandler');
const orchestrator = require('../services/orchestrator.service');
const planningRunner = require('../services/planning-runner.service');
const ApiError = require('../utils/ApiError');

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

  await planningRunner.approvePhase(req.params.projectId, Number(phaseIndex));
  res.json({ message: 'Phase approved, pipeline resuming' });
});

exports.refine = asyncHandler(async (req, res) => {
  const { phaseIndex, feedback } = req.body;
  if (phaseIndex == null) throw ApiError.badRequest('phaseIndex required');
  if (!feedback?.trim())  throw ApiError.badRequest('feedback required');

  // Respond immediately; refinement runs in background
  res.status(202).json({ message: 'Refinement started' });

  planningRunner.refinePhase(req.params.projectId, Number(phaseIndex), feedback).catch(() => {});
});
