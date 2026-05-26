const Project        = require('../models/Project');
const Phase          = require('../models/Phase');
const Document       = require('../models/Document');
const User           = require('../models/User');
const agentlog       = require('./agentlog.service');
const { getAgent }   = require('./ai/agents.registry');
const { runMeeting } = require('./ai/meeting-runner.service');
const { extractTasks } = require('./ai/task-extractor.service');
const { decrypt }    = require('./encryption.service');
const email          = require('./email.service');
const notifSvc       = require('./notification.service');
const queue          = require('./pipeline-queue.service');
const { emitToProject } = require('../sockets');
const logger         = require('../utils/logger');

// Phase type → agentName mapping (index order)
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
  // Prevent double-run
  const alreadyRunning = await Phase.findOne({ projectId, status: 'running' });
  if (alreadyRunning) {
    logger.warn('planning-runner: phase already running', { projectId });
    return;
  }

  const project = await Project.findById(projectId);
  if (!project || project.status === 'paused') return;

  // Find resume point
  const lastPhase = await Phase.findOne({ projectId }).sort('-index').lean();
  let startIndex  = 0;

  if (lastPhase) {
    if (lastPhase.status === 'awaiting_approval') return; // waiting for user
    if (lastPhase.status === 'completed')         startIndex = lastPhase.index + 1;
    if (lastPhase.status === 'failed')            startIndex = lastPhase.index; // retry
    if (lastPhase.status === 'interrupted')       startIndex = lastPhase.index;
  }

  if (startIndex >= PHASE_CONFIGS.length) {
    await Project.findByIdAndUpdate(projectId, { completionPercent: 50 });
    emitToProject(projectId, 'pipeline:planning_complete', {});
    logger.info('planning-runner: all phases complete, starting external consultants', { projectId });

    // Email + in-app notification: planning complete
    const proj  = await Project.findById(projectId).lean();
    const owner = await User.findById(proj?.ownerId).lean();
    if (owner?.email) {
      email.sendPlanningComplete({
        to: owner.email, userName: owner.name, projectTitle: proj.title,
      }).catch(() => {});
    }
    notifSvc.create({
      userId: proj.ownerId, projectId,
      type: 'planning_complete',
      title: `📋 ${proj.title} — האפיון הושלם`,
      message: 'כל 12 שלבי התכנון הושלמו. Claude מתחיל לכתוב קוד.',
    }).catch(() => {});

    // External Consultants → then Codegen (fire-and-forget chain)
    const { runExternalConsultants } = require('./ai/external-consultants.orchestrator');
    const { startCodegen }           = require('./codegen-runner.service');

    runExternalConsultants(projectId)
      .catch((err) => logger.warn('planning-runner: external consultants failed (non-fatal)', { projectId, error: err.message }))
      .finally(() => {
        startCodegen(projectId).catch((err) =>
          logger.error('planning-runner: codegen start failed', { projectId, error: err.message }),
        );
      });
    return;
  }

  for (let i = startIndex; i < PHASE_CONFIGS.length; i++) {
    // Re-check project state before each phase
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
        logger.warn('planning-runner: quota exhausted', { projectId, phaseIndex: i });
        await Phase.findOneAndUpdate(
          { projectId, index: i },
          { status: 'interrupted', errorMessage: err.message, completedAt: new Date() },
        );
        await Project.findByIdAndUpdate(projectId, {
          status: 'quota_paused',
          quotaPausedAt: new Date(),
        });
        emitToProject(projectId, 'pipeline:quota_exhausted', {
          phaseIndex: i,
          message:    err.message,
        });
        // Send quota warning email + in-app notification (fire-and-forget)
        const proj  = await Project.findById(projectId).lean();
        const owner = await User.findById(proj?.ownerId).lean();
        if (owner) {
          if (owner.email) {
            email.sendQuotaExhausted({
              to: owner.email, userName: owner.name,
              projectTitle: proj.title, plan: owner.plan || 'starter',
            }).catch(() => {});
          }
          notifSvc.create({
            userId:    proj.ownerId,
            projectId: projectId,
            type:      'quota_exhausted',
            title:     `⚠️ ${proj.title} — הפייפליין הופסק`,
            message:   'נגמר קרדיט ה-API. הטען קרדיט כדי להמשיך.',
          }).catch(() => {});
        }
        break;
      }
      logger.error('planning-runner: phase failed', { projectId, phaseIndex: i, error: err.message });
      await Phase.findOneAndUpdate(
        { projectId, index: i },
        { status: 'failed', errorMessage: err.message, completedAt: new Date() },
      );
      emitToProject(projectId, 'phase:failed', { phaseIndex: i, error: err.message });
      break;
    }

    const progress = Math.round(((i + 1) / PHASE_CONFIGS.length) * 50);
    await Project.findByIdAndUpdate(projectId, {
      currentPhaseIndex: i + 1,
      completionPercent: progress,
    });

    // Approval gate check
    const updated = await Project.findById(projectId).lean();
    if (updated.approvalGates) {
      emitToProject(projectId, 'phase:awaiting_approval', { phaseIndex: i });
      logger.info('planning-runner: waiting for approval', { projectId, phaseIndex: i });
      break; // Pipeline pauses; resume via approvePhase()
    }

    // Auto-approve: mark phase completed and continue
    await Phase.findByIdAndUpdate(phaseDoc.phase._id, { status: 'completed' });
    await Document.findByIdAndUpdate(phaseDoc.doc._id, { isApproved: true });
  }
}

async function _getUserCtx(project) {
  const user = await User.findById(project.ownerId).select('+settings.anthropicApiKey').lean();

  // Project key takes priority; fall back to user's global key
  const projectWithKey = await Project.findById(project._id)
    .select('+settings.anthropicApiKey').lean();
  const projectKey = projectWithKey?.settings?.anthropicApiKey
    ? decrypt(projectWithKey.settings.anthropicApiKey)
    : null;

  const userKey = user?.settings?.anthropicApiKey
    ? decrypt(user.settings.anthropicApiKey)
    : null;

  return {
    plan:   user?.plan || 'starter',
    apiKey: projectKey || userKey,
  };
}

async function _runSinglePhase(projectId, phaseIndex, refineFeedback = null) {
  const config    = PHASE_CONFIGS[phaseIndex];
  const agent     = getAgent(config.agentName);

  // Create or reset phase record
  let phase = await Phase.findOne({ projectId, index: phaseIndex });
  if (!phase) {
    phase = await Phase.create({
      projectId,
      type:      config.type,
      index:     phaseIndex,
      agentName: config.agentName,
      status:    'running',
      startedAt: new Date(),
    });
  } else {
    phase.status    = 'running';
    phase.startedAt = new Date();
    phase.errorMessage = undefined;
    await phase.save();
  }

  emitToProject(projectId, 'phase:started', { phaseIndex, agentName: config.agentName, phaseType: config.type });
  await agentlog.log(projectId, phase._id, config.agentName, 'started');

  // Load project + previous docs for context chaining
  const project      = await Project.findById(projectId).lean();
  const userCtx      = await _getUserCtx(project);
  const previousDocs = await Document.find({ projectId }).sort({ createdAt: 1 }).lean();

  const context = agent.buildProjectContext(project, previousDocs);
  let userPrompt = context;
  if (refineFeedback) {
    userPrompt += `\n\n## Refinement Request\n${refineFeedback}\n\nPlease revise your output based on this feedback.`;
  }

  // Run agent via global queue (respects MAX_CONCURRENT)
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

  // Save document (create or update for refine)
  let doc = await Document.findOne({ projectId, phaseId: phase._id });
  if (doc) {
    doc.content  = result.content;
    doc.summary  = agent.summarize(result.content);
    doc.version += 1;
    await doc.save();
  } else {
    doc = await Document.create({
      projectId,
      phaseId:  phase._id,
      type:     config.type,
      content:  result.content,
      summary:  agent.summarize(result.content),
    });
  }

  // Update phase record
  phase.status          = 'awaiting_approval';
  phase.completedAt     = new Date();
  phase.tokensUsed      = result.totalTokens;
  phase.narrativeStream = narrativeChunks;
  await phase.save();

  emitToProject(projectId, 'phase:completed', {
    phaseIndex,
    phaseType:  config.type,
    tokensUsed: result.totalTokens,
    docId:      doc._id,
  });

  // Run internal meeting (Pro plan only)
  if (userCtx.plan === 'pro') {
    try {
      await runMeeting(projectId, phase._id, config.type, result.content);
    } catch (err) {
      logger.warn('planning-runner: meeting failed (non-fatal)', { projectId, phaseIndex, error: err.message });
    }
  }

  // Extract tasks from dev_planning phase in background
  if (config.type === 'dev_planning') {
    extractTasks(projectId, phase._id, result.content).catch((err) =>
      logger.warn('planning-runner: task extraction failed (non-fatal)', { projectId, error: err.message }),
    );
  }

  return { phase, doc };
}

async function approvePhase(projectId, phaseIndex) {
  const phase = await Phase.findOne({ projectId, index: phaseIndex });
  if (!phase || phase.status !== 'awaiting_approval') {
    throw new Error('Phase is not awaiting approval');
  }

  phase.status = 'completed';
  await phase.save();
  await Document.findOneAndUpdate({ projectId, phaseId: phase._id }, { isApproved: true });

  emitToProject(projectId, 'phase:approved', { phaseIndex });

  // Resume pipeline in background
  startPlanning(projectId).catch((err) =>
    logger.error('planning-runner: resume after approve failed', { projectId, error: err.message }),
  );
}

async function refinePhase(projectId, phaseIndex, feedback) {
  const phase = await Phase.findOne({ projectId, index: phaseIndex });
  if (!phase || phase.status !== 'awaiting_approval') {
    throw new Error('Phase is not awaiting approval');
  }
  if (phase.refineCount >= 2) {
    throw new Error('Maximum refinements reached for this phase');
  }

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
