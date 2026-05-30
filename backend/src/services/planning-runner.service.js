const Project        = require('../models/Project');
const Phase          = require('../models/Phase');
const Document       = require('../models/Document');
const Meeting        = require('../models/Meeting');
const env            = require('../config/env');
const agentlog       = require('./agentlog.service');
const { getAgent }   = require('./ai/agents.registry');
const { runMeeting } = require('./ai/meeting-runner.service');
const { extractTasks } = require('./ai/task-extractor.service');
const queue          = require('./pipeline-queue.service');
const notifier       = require('./phase-notifier.service');
const { autoExtractLessons } = require('./lesson-extractor.service');
const { resolveApiKey } = require('./pipeline-utils.service');
const { emitToProject } = require('../sockets');
const logger         = require('../utils/logger');
const ApiError       = require('../utils/ApiError');
const { MAX_PHASE_REFINES } = require('../config/constants');

const PLANNING_COMPLETE_PERCENT = 50;

const PHASE_CONFIGS = [
  { type: 'idea_understanding',  agentName: 'IdeaAnalystAgent' },
  { type: 'product_discovery',   agentName: 'ProductDiscoveryAgent' },
  { type: 'market_analysis',     agentName: 'MarketAnalystAgent' },
  { type: 'ux_architecture',     agentName: 'UXArchitectAgent' },
  { type: 'tech_architecture',   agentName: 'TechArchitectAgent' },
  { type: 'system_design',       agentName: 'SystemDesignAgent' },
  { type: 'database_design',     agentName: 'DatabaseAgent' },
  { type: 'ai_agent_system',     agentName: 'AIAgentSystemAgent' },
  { type: 'orchestration',       agentName: 'OrchestrationAgent' },
  { type: 'dev_planning',        agentName: 'DevPlannerAgent' },
  { type: 'qa_strategy',         agentName: 'QAAgent' },
  { type: 'devops_strategy',     agentName: 'DevOpsAgent' },
];

async function startPlanning(projectId) {
  const alreadyRunning = await Phase.findOne({ projectId, status: 'running' });
  if (alreadyRunning) {
    logger.warn('planning-runner: phase already running', { projectId });
    return;
  }

  const project = await Project.findById(projectId);
  if (!project || project.status === 'paused') return;

  const lastPhase = await Phase.findOne({ projectId }).sort('-index').lean();
  let startIndex  = 0;

  if (lastPhase) {
    switch (lastPhase.status) {
      case 'awaiting_approval': return;
      case 'completed':         startIndex = lastPhase.index + 1; break;
      case 'failed':
      case 'interrupted':       startIndex = lastPhase.index;     break;
    }
  }

  if (startIndex >= PHASE_CONFIGS.length) {
    await _onAllPhasesComplete(projectId);
    return;
  }

  for (let i = startIndex; i < PHASE_CONFIGS.length; i++) {
    const fresh = await Project.findById(projectId).lean();
    if (!fresh || fresh.status === 'paused') {
      logger.info('planning-runner: pipeline paused', { projectId, atPhase: i });
      break;
    }

    let phaseDoc;
    try {
      phaseDoc = await _runSinglePhase(projectId, i);
    } catch (err) {
      if (err.code === 'QUOTA_EXHAUSTED') {
        await _handleQuotaExhausted(projectId, i, err);
        break;
      }
      logger.error('planning-runner: phase failed', { projectId, phaseIndex: i, error: err.message });
      await Phase.findOneAndUpdate(
        { projectId, index: i },
        { status: 'failed', errorMessage: err.message, completedAt: new Date() },
      );
      await Project.findByIdAndUpdate(projectId, { status: 'failed' });
      emitToProject(projectId, 'phase:failed', { phaseIndex: i, error: err.message });
      break;
    }

    const progress = Math.round(((i + 1) / PHASE_CONFIGS.length) * PLANNING_COMPLETE_PERCENT);
    const updated = await Project.findByIdAndUpdate(
      projectId,
      { currentPhaseIndex: i + 1, completionPercent: progress },
      { new: true },
    ).lean();

    if (updated.approvalGates !== false) {
      emitToProject(projectId, 'phase:awaiting_approval', { phaseIndex: i });
      logger.info('planning-runner: waiting for approval', { projectId, phaseIndex: i });
      break;
    }

    await Phase.findByIdAndUpdate(phaseDoc.phase._id, { status: 'completed' });
    await Document.findByIdAndUpdate(phaseDoc.doc._id, { isApproved: true });
  }
}

async function _onAllPhasesComplete(projectId) {
  await Project.findByIdAndUpdate(projectId, { completionPercent: PLANNING_COMPLETE_PERCENT });
  emitToProject(projectId, 'pipeline:planning_complete', {});
  logger.info('planning-runner: all phases complete', { projectId });

  notifier.notifyPlanningComplete(projectId).catch((err) =>
    logger.warn('planning-runner: notifyPlanningComplete failed', { projectId, error: err.message }),
  );
  autoExtractLessons(projectId).catch((err) =>
    logger.warn('planning-runner: autoExtractLessons failed', { projectId, error: err.message }),
  );

  const { runExternalConsultants }          = require('./ai/external-consultants.orchestrator');
  const { startCodegen }                    = require('./codegen-runner.service');
  const { detectAndPauseForCredentials }    = require('./service-detector.service');

  runExternalConsultants(projectId)
    .catch((err) => logger.warn('planning-runner: external consultants failed', { projectId, error: err.message }))
    .finally(async () => {
      try {
        const paused = await detectAndPauseForCredentials(projectId);
        if (paused) { logger.info('planning-runner: paused for credentials', { projectId }); return; }
      } catch (err) {
        logger.warn('planning-runner: credential detection failed', { projectId, error: err.message });
      }
      startCodegen(projectId).catch((err) =>
        logger.error('planning-runner: codegen start failed', { projectId, error: err.message }),
      );
    });
}

async function _handleQuotaExhausted(projectId, phaseIndex, err) {
  logger.warn('planning-runner: quota exhausted', { projectId, phaseIndex });
  await Phase.findOneAndUpdate(
    { projectId, index: phaseIndex },
    { status: 'interrupted', errorMessage: err.message, completedAt: new Date() },
  );
  await Project.findByIdAndUpdate(projectId, { status: 'quota_paused', quotaPausedAt: new Date() });
  emitToProject(projectId, 'pipeline:quota_exhausted', { phaseIndex, message: err.message });
  notifier.notifyQuotaExhausted(projectId).catch((err) =>
    logger.warn('planning-runner: notifyQuotaExhausted failed', { projectId, error: err.message }),
  );
}

async function _getUserCtx(project) {
  return resolveApiKey(project._id, project.ownerId);
}

async function _runSinglePhase(projectId, phaseIndex, refineFeedback = null) {
  const config = PHASE_CONFIGS[phaseIndex];
  const agent  = getAgent(config.agentName);

  let phase = await Phase.findOne({ projectId, index: phaseIndex });
  if (!phase) {
    phase = await Phase.create({
      projectId, type: config.type, index: phaseIndex,
      agentName: config.agentName, status: 'running', startedAt: new Date(),
    });
  } else {
    phase.status = 'running';
    phase.startedAt = new Date();
    phase.errorMessage = undefined;
    await phase.save();
  }

  emitToProject(projectId, 'phase:started', { phaseIndex, agentName: config.agentName, phaseType: config.type });
  await agentlog.log(projectId, phase._id, config.agentName, 'started');

  const project      = await Project.findById(projectId).lean();
  const userCtx      = await _getUserCtx(project);
  const previousDocs = await Document.find({ projectId }).sort({ createdAt: 1 }).lean();

  let userPrompt = agent.buildProjectContext(project, previousDocs);
  if (refineFeedback) {
    userPrompt += `\n\n## Refinement Request\n${refineFeedback}\n\nPlease revise your output based on this feedback.`;
  }

  const narrativeChunks = [];
  const result = await queue.enqueue(() =>
    agent.run(userPrompt, {
      userCtx,
      onNarrativeChunk: (chunk) => {
        narrativeChunks.push(chunk);
        emitToProject(projectId, 'phase:narrative', { phaseIndex, chunk });
      },
    }),
  );

  await agentlog.log(projectId, phase._id, config.agentName, 'completed', null, { tokensUsed: result.totalTokens });

  let doc = await Document.findOne({ projectId, phaseId: phase._id });
  if (doc) {
    doc.content  = result.content;
    doc.summary  = agent.summarize(result.content);
    doc.version += 1;
    await doc.save();
  } else {
    doc = await Document.create({
      projectId, phaseId: phase._id, type: config.type,
      content: result.content, summary: agent.summarize(result.content),
    });
  }

  phase.status          = 'awaiting_approval';
  phase.completedAt     = new Date();
  phase.tokensUsed      = result.totalTokens;
  phase.narrativeStream = narrativeChunks;
  await phase.save();

  emitToProject(projectId, 'phase:completed', {
    phaseIndex, phaseType: config.type, tokensUsed: result.totalTokens, docId: doc._id,
  });

  try {
    const scheduledAt    = new Date(Date.now() + env.MEETING_PRE_DELAY_MS);
    const meetingRecord  = await Meeting.create({
      projectId, phaseId: phase._id, type: config.type,
      participants: [], status: 'scheduled', scheduledAt,
    });
    emitToProject(projectId, 'meeting:scheduled', { phaseIndex, scheduledAt, meetingId: meetingRecord._id });
    await new Promise((r) => setTimeout(r, env.MEETING_PRE_DELAY_MS));
    await runMeeting(projectId, phase._id, config.type, result.content, phaseIndex, meetingRecord._id);
  } catch (err) {
    logger.warn('planning-runner: meeting failed (non-fatal)', { projectId, phaseIndex, error: err.message });
  }

  if (config.type === 'dev_planning') {
    extractTasks(projectId, phase._id, result.content).catch((err) =>
      logger.warn('planning-runner: task extraction failed', { projectId, error: err.message }),
    );
  }

  return { phase, doc };
}

async function approvePhase(projectId, phaseIndex) {
  const phase = await Phase.findOne({ projectId, index: phaseIndex });
  if (!phase || phase.status !== 'awaiting_approval') {
    throw ApiError.badRequest('Phase is not awaiting approval');
  }

  phase.status = 'completed';
  await phase.save();
  await Document.findOneAndUpdate({ projectId, phaseId: phase._id }, { isApproved: true });
  emitToProject(projectId, 'phase:approved', { phaseIndex });

  startPlanning(projectId).catch((err) =>
    logger.error('planning-runner: resume after approve failed', { projectId, error: err.message }),
  );
}

async function refinePhase(projectId, phaseIndex, feedback) {
  const phase = await Phase.findOne({ projectId, index: phaseIndex });
  if (!phase || phase.status !== 'awaiting_approval') throw ApiError.badRequest('Phase is not awaiting approval');
  if (phase.refineCount >= MAX_PHASE_REFINES) throw ApiError.badRequest('Maximum refinements reached for this phase');

  phase.refineCount += 1;
  phase.status       = 'running';
  await phase.save();

  emitToProject(projectId, 'phase:refining', { phaseIndex, refineCount: phase.refineCount });

  try {
    await _runSinglePhase(projectId, phaseIndex, feedback);
  } catch (err) {
    await Phase.findOneAndUpdate(
      { projectId, index: phaseIndex },
      { status: 'failed', errorMessage: err.message },
    );
    emitToProject(projectId, 'phase:failed', { phaseIndex, error: err.message });
  }
}

module.exports = { startPlanning, approvePhase, refinePhase };
