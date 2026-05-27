const Project = require('../models/Project');
const Phase   = require('../models/Phase');
const User    = require('../models/User');
const { startPlanning } = require('./planning-runner.service');
const { emitToProject } = require('../sockets');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// Rate limiting: max 3 pipeline starts per user per hour — persisted in MongoDB
const HOUR_MS    = 60 * 60 * 1000;
const MAX_STARTS = 3;

async function startPipeline(projectId, userId) {
  await _checkRateLimit(userId);

  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(userId)) throw ApiError.forbidden();

  // Reject only statuses that are truly in-progress or already done
  const blocked = ['coding', 'deploying', 'live'];
  if (blocked.includes(project.status)) {
    throw ApiError.badRequest(`Cannot start pipeline — project is currently: ${project.status}`);
  }

  const running = await Phase.findOne({ projectId, status: 'running' });
  if (running) throw ApiError.badRequest('Pipeline is already running');

  // Auto-transition any non-planning status to planning before starting
  if (project.status !== 'planning') {
    logger.info('orchestrator: transitioning status to planning', { projectId, from: project.status });
    project.status = 'planning';
    await project.save();
  }

  // Validate API key exists before firing — throws before fire-and-forget so error reaches frontend
  const hasKey = await _hasApiKey(projectId, project.ownerId);
  if (!hasKey) {
    throw ApiError.badRequest(
      'מפתח Anthropic לא מוגדר — הגדר מפתח API בהגדרות הפרויקט או בהגדרות החשבון לפני הפעלת הפייפליין',
    );
  }

  await _recordStart(userId);
  logger.info('orchestrator: starting pipeline', { projectId, userId });

  emitToProject(projectId, 'pipeline:started', { projectId });

  // Fire-and-forget — WebSocket events stream progress
  startPlanning(projectId).catch((err) => {
    logger.error('orchestrator: pipeline error', { projectId, error: err.message });
    emitToProject(projectId, 'pipeline:error', { error: err.message });
  });
}

async function pausePipeline(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(userId)) throw ApiError.forbidden();

  project.status = 'paused';
  await project.save();

  // Mark any running phase as interrupted
  await Phase.findOneAndUpdate(
    { projectId, status: 'running' },
    { status: 'interrupted' },
  );

  emitToProject(projectId, 'pipeline:paused', {});
  logger.info('orchestrator: pipeline paused', { projectId });
}

async function getPipelineStatus(projectId, userId) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(userId)) throw ApiError.forbidden();

  const phases = await Phase.find({ projectId }).sort('index').lean();
  return { project, phases };
}

async function _checkRateLimit(userId) {
  const cutoff = new Date(Date.now() - HOUR_MS);
  const user   = await User.findById(userId).select('+pipelineStarts').lean();
  const recent = (user?.pipelineStarts || []).filter((t) => t > cutoff);
  if (recent.length >= MAX_STARTS) {
    const resetAt = recent.length ? new Date(Math.min(...recent.map((t) => t.getTime())) + HOUR_MS) : null;
    const resetStr = resetAt
      ? resetAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      : null;
    throw ApiError.badRequest(
      `הגעת למגבלת הניסיונות — מקסימום ${MAX_STARTS} הפעלות פייפליין בשעה.` +
      (resetStr ? ` ניתן לנסות שוב מ-${resetStr}.` : ''),
    );
  }
}

async function _recordStart(userId) {
  const cutoff = new Date(Date.now() - HOUR_MS);
  // Aggregation pipeline update: prune old entries + push new one atomically
  await User.findByIdAndUpdate(userId, [
    {
      $set: {
        pipelineStarts: {
          $concatArrays: [
            { $filter: { input: { $ifNull: ['$pipelineStarts', []] }, cond: { $gte: ['$$this', cutoff] } } },
            [new Date()],
          ],
        },
      },
    },
  ]);
}

async function _hasApiKey(projectId, ownerId) {
  const project = await Project.findById(projectId).select('+settings.anthropicApiKey').lean();
  if (project?.settings?.anthropicApiKey) return true;
  const user = await User.findById(ownerId).select('+settings.anthropicApiKey').lean();
  return !!(user?.settings?.anthropicApiKey);
}

module.exports = { startPipeline, pausePipeline, getPipelineStatus };
