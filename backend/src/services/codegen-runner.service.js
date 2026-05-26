const Project          = require('../models/Project');
const Phase            = require('../models/Phase');
const Document         = require('../models/Document');
const GeneratedFile    = require('../models/GeneratedFile');
const agentlog         = require('./agentlog.service');
const { getAgent }     = require('./ai/agents.registry');
const { parseFiles }   = require('./file-parser.service');
const { scan }         = require('./secret-scanner.service');
const queue            = require('./pipeline-queue.service');
const { decrypt }      = require('./encryption.service');
const User             = require('../models/User');
const { emitToProject } = require('../sockets');
const logger           = require('../utils/logger');

// Code gen phases — index continues from planning (12-17)
const CODEGEN_PHASES = [
  {
    index:     12,
    type:      'db_schema',
    agentName: 'DatabaseSchemaAgent',
    label:     'Database Schemas',
    // Which planning doc types to include as context (full content)
    contextDocs: ['database_design', 'system_design'],
    // Which previously generated file types to include
    prevFilePatterns: [],
  },
  {
    index:     13,
    type:      'backend_scaffold',
    agentName: 'BackendScaffoldAgent',
    label:     'Backend API',
    contextDocs: ['system_design', 'tech_architecture', 'product_discovery'],
    prevFilePatterns: ['backend/src/models/'],
  },
  {
    index:     14,
    type:      'frontend_scaffold',
    agentName: 'FrontendScaffoldAgent',
    label:     'Frontend App',
    contextDocs: ['ux_architecture', 'system_design', 'product_discovery'],
    prevFilePatterns: ['backend/src/routes/', 'backend/src/models/'],
  },
  {
    index:     15,
    type:      'tests',
    agentName: 'TestsAgent',
    label:     'Tests',
    contextDocs: ['qa_strategy', 'system_design'],
    prevFilePatterns: ['backend/src/'],
  },
  {
    index:     16,
    type:      'config',
    agentName: 'ConfigAgent',
    label:     'Config & DevOps',
    contextDocs: ['devops_strategy', 'tech_architecture'],
    prevFilePatterns: [],
  },
  {
    index:     17,
    type:      'review',
    agentName: 'ReviewAgent',
    label:     'Code Review & Fixes',
    contextDocs: [],
    prevFilePatterns: ['*'],   // all files
  },
];

async function startCodegen(projectId) {
  const alreadyRunning = await Phase.findOne({ projectId, index: { $gte: 12 }, status: 'running' });
  if (alreadyRunning) {
    logger.warn('codegen-runner: already running', { projectId });
    return;
  }

  const project = await Project.findById(projectId);
  if (!project) return;

  await Project.findByIdAndUpdate(projectId, { status: 'coding' });
  emitToProject(projectId, 'pipeline:status', { status: 'coding' });

  const userCtx = await _getUserCtx(project);

  for (const cfg of CODEGEN_PHASES) {
    const fresh = await Project.findById(projectId).lean();
    if (!fresh || fresh.status === 'paused' || fresh.status === 'quota_paused') {
      logger.info('codegen-runner: paused', { projectId });
      break;
    }

    try {
      await _runCodegenPhase(projectId, cfg, userCtx);
    } catch (err) {
      if (err.code === 'QUOTA_EXHAUSTED') {
        await Phase.findOneAndUpdate({ projectId, index: cfg.index }, { status: 'interrupted', errorMessage: err.message });
        await Project.findByIdAndUpdate(projectId, { status: 'quota_paused', quotaPausedAt: new Date() });
        emitToProject(projectId, 'pipeline:quota_exhausted', { phaseIndex: cfg.index, message: err.message });
        return;
      }
      logger.error('codegen-runner: phase failed', { projectId, phase: cfg.type, error: err.message });
      await Phase.findOneAndUpdate({ projectId, index: cfg.index }, { status: 'failed', errorMessage: err.message });
      emitToProject(projectId, 'phase:failed', { phaseIndex: cfg.index, error: err.message });
      break;
    }

    const pct = 50 + Math.round(((cfg.index - 11) / CODEGEN_PHASES.length) * 45);
    await Project.findByIdAndUpdate(projectId, { completionPercent: pct });
  }

  // Check if all codegen phases completed successfully
  const failedPhase = await Phase.findOne({ projectId, index: { $gte: 12 }, status: 'failed' });
  if (!failedPhase) {
    logger.info('codegen-runner: all phases complete', { projectId });
    emitToProject(projectId, 'pipeline:codegen_complete', {});
    // Trigger deployment (imported lazily to avoid circular deps)
    const { runDeployment } = require('./deployment-runner.service');
    runDeployment(projectId).catch((err) =>
      logger.error('codegen-runner: deployment failed', { projectId, error: err.message }),
    );
  }
}

async function _runCodegenPhase(projectId, cfg, userCtx) {
  const agent = getAgent(cfg.agentName);

  // Create or reset phase record
  let phase = await Phase.findOne({ projectId, index: cfg.index });
  if (!phase) {
    phase = await Phase.create({
      projectId, type: cfg.type, index: cfg.index,
      agentName: cfg.agentName, status: 'running', startedAt: new Date(),
    });
  } else {
    phase.status = 'running'; phase.startedAt = new Date(); phase.errorMessage = undefined;
    await phase.save();
  }

  emitToProject(projectId, 'phase:started', { phaseIndex: cfg.index, agentName: cfg.agentName, phaseType: cfg.type });
  await agentlog.log(projectId, phase._id, cfg.agentName, 'started');

  // Build context
  const project      = await Project.findById(projectId).lean();
  const planningDocs = await _getPlanningDocs(projectId, cfg.contextDocs);
  const prevFiles    = await _getPreviousFiles(projectId, cfg.prevFilePatterns);
  const userPrompt   = agent.buildCodegenContext(project, planningDocs, prevFiles);

  // Run agent
  const narrativeChunks = [];
  const result = await queue.enqueue(() =>
    agent.run(userPrompt, {
      userCtx,
      onNarrativeChunk: (chunk) => {
        narrativeChunks.push(chunk);
        emitToProject(projectId, 'phase:narrative', { phaseIndex: cfg.index, chunk });
      },
    }),
  );

  await agentlog.log(projectId, phase._id, cfg.agentName, 'completed', null, { tokensUsed: result.totalTokens });

  // Handle ReviewAgent's NO_CORRECTIONS sentinel
  if (cfg.agentName === 'ReviewAgent' && result.content.includes('<<<NO_CORRECTIONS>>>')) {
    phase.status = 'completed'; phase.completedAt = new Date(); phase.tokensUsed = result.totalTokens;
    await phase.save();
    emitToProject(projectId, 'phase:completed', { phaseIndex: cfg.index, phaseType: cfg.type });
    return;
  }

  // Parse files from output
  const files = parseFiles(result.content);
  logger.info('codegen-runner: parsed files', { projectId, phase: cfg.type, count: files.length });

  // Save files + emit events
  for (const file of files) {
    const scanResult = scan(file.filePath, file.content);
    const status     = scanResult.clean ? 'validated' : 'failed';

    if (!scanResult.clean) {
      logger.warn('codegen-runner: secret detected', { projectId, file: file.filePath, findings: scanResult.findings });
      emitToProject(projectId, 'file:secret_detected', { filePath: file.filePath, findings: scanResult.findings });
      continue;
    }

    // Upsert — ReviewAgent may overwrite files from earlier phases
    await GeneratedFile.findOneAndUpdate(
      { projectId, filePath: file.filePath },
      { projectId, phaseId: phase._id, filePath: file.filePath, content: file.content, language: file.language, status },
      { upsert: true, new: true },
    );

    emitToProject(projectId, 'file:written', {
      phaseIndex: cfg.index,
      filePath:   file.filePath,
      language:   file.language,
      lines:      file.content.split('\n').length,
    });
  }

  phase.status      = 'completed';
  phase.completedAt = new Date();
  phase.tokensUsed  = result.totalTokens;
  phase.narrativeStream = narrativeChunks;
  await phase.save();

  emitToProject(projectId, 'phase:completed', {
    phaseIndex: cfg.index, phaseType: cfg.type,
    tokensUsed: result.totalTokens, filesGenerated: files.length,
  });
}

async function _getUserCtx(project) {
  const [user, projectWithKey] = await Promise.all([
    User.findById(project.ownerId).select('+settings.anthropicApiKey').lean(),
    Project.findById(project._id).select('+settings.anthropicApiKey').lean(),
  ]);
  let apiKey = null;
  if (projectWithKey?.settings?.anthropicApiKey) {
    try { apiKey = decrypt(projectWithKey.settings.anthropicApiKey); } catch { }
  }
  if (!apiKey && user?.settings?.anthropicApiKey) {
    try { apiKey = decrypt(user.settings.anthropicApiKey); } catch { }
  }
  return { plan: user?.plan || 'starter', apiKey };
}

async function _getPlanningDocs(projectId, types) {
  if (!types || types.length === 0) return [];
  return Document.find({ projectId, type: { $in: types } }).lean();
}

async function _getPreviousFiles(projectId, patterns) {
  if (!patterns || patterns.length === 0) return [];
  if (patterns[0] === '*') {
    return GeneratedFile.find({ projectId, status: 'validated' }).lean();
  }
  const all = await GeneratedFile.find({ projectId, status: 'validated' }).lean();
  return all.filter((f) => patterns.some((p) => f.filePath.startsWith(p)));
}

module.exports = { startCodegen };
