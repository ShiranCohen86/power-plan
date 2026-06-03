/**
 * Sprints 101-110: phase rating, revision history, bulk approve, transcript download,
 *                  custom pause points, phase document search
 */
const asyncHandler    = require('../utils/asyncHandler');
const ApiError        = require('../utils/ApiError');
const Phase           = require('../models/Phase');
const Document        = require('../models/Document');
const Meeting         = require('../models/Meeting');
const MeetingMessage  = require('../models/MeetingMessage');
const projectService  = require('../services/project.service');
const planningRunner  = require('../services/planning-runner.service');
const Project         = require('../models/Project');
const logger          = require('../utils/logger');

// Sprint 101: rate a phase output (1=thumbs down, 2=thumbs up)
exports.ratePhase = asyncHandler(async (req, res) => {
  const { phaseIndex, rating } = req.body;
  if (phaseIndex == null) throw ApiError.badRequest('phaseIndex required');
  if (![1, 2].includes(rating)) throw ApiError.badRequest('rating must be 1 or 2');

  await projectService.getById(req.params.projectId, req.user.id);

  const phase = await Phase.findOneAndUpdate(
    { projectId: req.params.projectId, index: phaseIndex },
    { rating },
    { new: true },
  );
  if (!phase) throw ApiError.notFound('Phase not found');
  res.json({ phaseIndex, rating: phase.rating });
});

// Sprint 102: phase revision history — list previous document versions
exports.getPhaseHistory = asyncHandler(async (req, res) => {
  const { phaseIndex } = req.params;
  await projectService.getById(req.params.projectId, req.user.id);

  const phase = await Phase.findOne({ projectId: req.params.projectId, index: Number(phaseIndex) }).lean();
  if (!phase) throw ApiError.notFound('Phase not found');

  const docs = await Document.find({ phaseId: phase._id })
    .select('content summary version createdAt updatedAt')
    .sort({ version: 1 })
    .lean();

  res.json(docs.map((d) => ({
    version:   d.version,
    summary:   d.summary,
    content:   d.content?.slice(0, 500) + (d.content?.length > 500 ? '…' : ''),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  })));
});

// Sprint 104: approve all pending planning phases at once
exports.approveAll = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);

  const awaitingPhases = await Phase.find({
    projectId: req.params.projectId,
    status:    'awaiting_approval',
  }).sort({ index: 1 }).lean();

  if (!awaitingPhases.length) return res.json({ approved: 0 });

  // Approve each sequentially to respect pipeline ordering
  let approved = 0;
  for (const phase of awaitingPhases) {
    try {
      await planningRunner.approvePhase(req.params.projectId, phase.index);
      approved++;
    } catch (err) {
      logger.warn('phase-extras: approveAll partial failure', { phaseIndex: phase.index, error: err.message });
      break; // stop on first error
    }
  }

  res.json({ approved });
});

// Sprint 107: download meeting transcript for a phase
exports.getMeetingTranscript = asyncHandler(async (req, res) => {
  const { phaseIndex } = req.params;
  await projectService.getById(req.params.projectId, req.user.id);

  const meeting = await Meeting.findOne({ projectId: req.params.projectId, type: String(phaseIndex) }).lean();
  if (!meeting) throw ApiError.notFound('Meeting not found for this phase');

  const messages = await MeetingMessage.find({ meetingId: meeting._id })
    .sort({ timestamp: 1 }).lean();

  const lines = messages.map((m) => `[${m.displayName}]: ${m.message}`).join('\n');
  const transcript = `Phase ${phaseIndex} Meeting Transcript\n${'='.repeat(40)}\n${lines}`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="phase-${phaseIndex}-meeting.txt"`);
  res.send(transcript);
});

// Sprint 109: update custom pause points for a project
exports.updatePausePoints = asyncHandler(async (req, res) => {
  const { pauseBeforePhases } = req.body;
  if (!Array.isArray(pauseBeforePhases)) throw ApiError.badRequest('pauseBeforePhases must be an array');

  const cleaned = [...new Set(pauseBeforePhases.filter((n) => Number.isInteger(n) && n >= 0 && n <= 18))];

  const project = await Project.findOneAndUpdate(
    { _id: req.params.projectId, ownerId: req.user.id, deletedAt: null },
    { pauseBeforePhases: cleaned },
    { new: true },
  );
  if (!project) throw ApiError.notFound('Project not found');
  res.json({ pauseBeforePhases: project.pauseBeforePhases });
});

// Sprint 110: search across phase documents
exports.searchPhases = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) throw ApiError.badRequest('q must be at least 2 characters');

  await projectService.getById(req.params.projectId, req.user.id);

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const docs  = await Document.find({
    projectId: req.params.projectId,
    content:   { $regex: regex },
  }).select('type content phaseId').lean();

  const results = docs.map((d) => {
    const idx = d.content.search(regex);
    const start = Math.max(0, idx - 100);
    const end   = Math.min(d.content.length, idx + 200);
    return {
      type:    d.type,
      phaseId: d.phaseId,
      excerpt: d.content.slice(start, end),
      matchAt: idx - start,
    };
  });

  res.json(results);
});

// Sprint 105: pipeline cost estimate (based on historical avg tokens × pricing)
exports.getCostEstimate = asyncHandler(async (req, res) => {
  const Phase          = require('../models/Phase');
  const { tokensToUSD } = require('../services/usage.service');
  const agg   = await Phase.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, avgTokensPerPhase: { $avg: '$tokensUsed' }, count: { $sum: 1 } } },
  ]);
  const avgPerPhase     = agg[0]?.avgTokensPerPhase || 4000;
  const totalPhases     = 19;
  const estimatedTokens = Math.round(avgPerPhase * totalPhases);
  const estimatedUSD    = tokensToUSD(estimatedTokens);
  res.json({ estimatedTokens, estimatedUSD, avgTokensPerPhase: Math.round(avgPerPhase), totalPhases });
});

// Sprint 106: pipeline time estimate based on historical avg
exports.getTimeEstimate = asyncHandler(async (req, res) => {
  const Phase = require('../models/Phase');
  const agg   = await Phase.aggregate([
    { $match: { status: 'completed', startedAt: { $exists: true }, completedAt: { $exists: true } } },
    { $project: { duration: { $subtract: ['$completedAt', '$startedAt'] } } },
    { $group: { _id: null, avgMs: { $avg: '$duration' }, count: { $sum: 1 } } },
  ]);
  const avgMs      = agg[0]?.avgMs || 90_000; // default 90s per phase
  const totalPhases = 19;
  const estMs       = avgMs * totalPhases;
  res.json({
    avgSecondsPerPhase: Math.round(avgMs / 1000),
    estimatedMinutes:   Math.round(estMs / 60_000),
    totalPhases,
    sampleSize:         agg[0]?.count || 0,
  });
});
