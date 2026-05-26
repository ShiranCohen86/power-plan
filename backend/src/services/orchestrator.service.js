const Project = require('../models/Project');
const Phase   = require('../models/Phase');
const { startPlanning } = require('./planning-runner.service');
const { emitToProject } = require('../sockets');
const ApiError = require('../utils/ApiError');
const logger   = require('../utils/logger');

// Rate limiting: max 3 pipeline starts per user per hour
const startHistory = new Map(); // userId → [timestamp, ...]
const HOUR_MS      = 60 * 60 * 1000;
const MAX_STARTS   = 3;

async function startPipeline(projectId, userId) {
  _checkRateLimit(userId);

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

  _recordStart(userId);
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

function _checkRateLimit(userId) {
  const key     = String(userId);
  const now     = Date.now();
  const history = (startHistory.get(key) || []).filter((t) => now - t < HOUR_MS);

  if (history.length >= MAX_STARTS) {
    throw ApiError.badRequest(`Rate limit: max ${MAX_STARTS} pipeline starts per hour`);
  }
}

function _recordStart(userId) {
  const key     = String(userId);
  const now     = Date.now();
  const history = (startHistory.get(key) || []).filter((t) => now - t < HOUR_MS);
  history.push(now);
  startHistory.set(key, history);
}

module.exports = { startPipeline, pausePipeline, getPipelineStatus };
