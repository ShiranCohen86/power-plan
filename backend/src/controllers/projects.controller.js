const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const projectService = require('../services/project.service');
const discoveryService = require('../services/discovery.service');
const Project = require('../models/Project');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const MeetingMessage = require('../models/MeetingMessage');
const { encrypt, decrypt } = require('../services/encryption.service');

function friendlyAIError(err) {
  const raw = err.message || '';
  try {
    const jsonStart = raw.indexOf('{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(raw.slice(jsonStart));
      const msg = parsed?.error?.message || '';
      if (msg.includes('credit balance') || msg.includes('too low')) {
        return 'אין מספיק קרדיט ב-API. הכנס מפתח Anthropic אישי בהגדרות (Starter Plan) או טען קרדיט לחשבון הפלטפורמה.';
      }
      if (msg) return msg;
    }
  } catch { /* not JSON — return as-is */ }
  if (raw.includes('credit') || raw.includes('billing')) {
    return 'אין מספיק קרדיט ב-API. הכנס מפתח Anthropic אישי בהגדרות.';
  }
  return 'שגיאה בתקשורת עם ה-AI. אנא נסה שוב.';
}

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.create({ ...req.body, ownerId: req.user.id });
  res.status(201).json(project);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id);
  res.status(204).end();
});

const VALID_SORTS = new Set(['date', 'status', 'completion']);

exports.list = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit, 10) || 12);
  const search = (req.query.search || '').slice(0, 100);
  const sort   = VALID_SORTS.has(req.query.sort) ? req.query.sort : 'date';
  const result = await projectService.listByOwner(req.user.id, { page, limit, search, sort });
  res.json(result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id, req.user.id);
  res.json(project);
});

// SSE: streams the next discovery question from Claude.
// Body: { answers: [{question, answer}] }
// Streams text chunks, then sends { done: true } or { done: true, finished: true } when all 7 answered.
exports.discoveryNext = asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id, req.user.id);
  if (project.status !== 'onboarding') {
    return res.status(400).json({ error: 'Discovery already completed' });
  }

  // Validate answers array
  const answers = req.body.answers;
  if (answers !== undefined) {
    if (!Array.isArray(answers) || answers.length > 20) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }
    for (const a of answers) {
      if (!a || typeof a.question !== 'string' || typeof a.answer !== 'string') {
        return res.status(400).json({ error: 'Invalid answer object' });
      }
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Abort controller so we can cancel the Claude stream when client disconnects
  const abortController = new AbortController();

  // Close cleanly if client disconnects mid-stream
  req.on('close', () => abortController.abort());

  // Safety timeout — 5 minutes max per discovery question
  const timeout = setTimeout(() => {
    abortController.abort();
    if (!res.writableEnded) res.end();
  }, 5 * 60 * 1000);

  const cleanup = () => clearTimeout(timeout);

  // Resolve API key: project key → user global key; use real user plan
  const [projectWithKey, reqUser] = await Promise.all([
    Project.findById(req.params.id).select('+settings.anthropicApiKey'),
    User.findById(req.user.id).select('+settings.anthropicApiKey +plan').lean(),
  ]);

  let apiKey = null;
  if (projectWithKey?.settings?.anthropicApiKey) {
    try { apiKey = decrypt(projectWithKey.settings.anthropicApiKey); } catch { /* invalid */ }
  }
  if (!apiKey && reqUser?.settings?.anthropicApiKey) {
    try { apiKey = decrypt(reqUser.settings.anthropicApiKey); } catch { /* invalid */ }
  }

  if (!apiKey) {
    cleanup();
    res.write(`data: ${JSON.stringify({ error: 'לא הוגדר מפתח Anthropic. הכנס מפתח בהגדרות הפרויקט או בהגדרות הכלליות.' })}\n\n`);
    res.end();
    return;
  }

  try {
    await discoveryService.streamNextQuestion(res, {
      idea:       project.idea,
      title:      project.title,
      answers:    answers || [],
      userPlan:   reqUser?.plan || 'starter',
      userApiKey: apiKey,
    }, abortController.signal);
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: friendlyAIError(err) })}\n\n`);
      res.end();
    }
  } finally {
    cleanup();
  }
});

// Saves all discovery answers and transitions project to 'planning'
exports.discoveryComplete = asyncHandler(async (req, res) => {
  const project = await projectService.saveDiscoveryAnswers(
    req.params.id,
    req.user.id,
    req.body.answers,
  );
  res.json(project);
});

// Returns all meeting messages for a project grouped by phaseIndex, oldest first.
// Used to replay meeting history when workspace is loaded after the fact.
exports.getMeetings = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const meetings = await Meeting.find({ projectId: req.params.id }).sort('startedAt').lean();
  if (!meetings.length) return res.json([]);

  const meetingIds = meetings.map((m) => m._id);
  const messages   = await MeetingMessage.find({ meetingId: { $in: meetingIds } }).sort('timestamp').lean();

  const meetingById = new Map(meetings.map((m) => [String(m._id), m]));
  const grouped = meetings.map((m) => ({
    phaseIndex: m.type,
    meetingId:  String(m._id),
    participants: m.participants,
    startedAt:  m.startedAt,
    messages:   [],
  }));
  const groupedById = new Map(grouped.map((g) => [g.meetingId, g]));

  for (const msg of messages) {
    const g = groupedById.get(String(msg.meetingId));
    if (g) g.messages.push({ role: msg.role, displayName: msg.displayName, color: msg.color, message: msg.message, type: msg.type });
  }

  res.json(grouped.filter((g) => g.messages.length > 0));
});

// ── Per-project settings ───────────────────────────────────────────────────

exports.getProjectSettings = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id })
    .select('+settings.anthropicApiKey +settings.githubToken +settings.renderApiKey');
  if (!project) throw ApiError.notFound('Project not found');

  // Check user fallback key as well
  const user = await User.findById(req.user.id).select('+settings.anthropicApiKey').lean();

  const s = project.settings || {};
  const safeDecrypt = (val) => { try { return val ? _maskKey(decrypt(val)) : null; } catch { return null; } };

  const hasProjectKey = !!(s.anthropicApiKey);
  const hasUserKey    = !!(user?.settings?.anthropicApiKey);

  res.json({
    hasApiKey:        hasProjectKey || hasUserKey,   // true if either key is available
    hasProjectApiKey: hasProjectKey,                  // true only if project has its own key
    usingFallback:    !hasProjectKey && hasUserKey,   // true if using user global key
    hasGithubToken:   !!(s.githubToken),
    hasRenderToken:   !!(s.renderApiKey),
    apiKeyHint:       safeDecrypt(s.anthropicApiKey),
    githubTokenHint:  safeDecrypt(s.githubToken),
    renderTokenHint:  safeDecrypt(s.renderApiKey),
  });
});

exports.setProjectApiKey = asyncHandler(async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey?.startsWith('sk-ant-')) throw ApiError.badRequest('מפתח API לא תקין — חייב להתחיל עם "sk-ant-"');
  const project = await _ownedProject(req);
  if (!project.settings) project.settings = {};
  project.settings.anthropicApiKey = encrypt(apiKey);
  await project.save();
  res.json({ hasApiKey: true, apiKeyHint: _maskKey(apiKey) });
});

exports.deleteProjectApiKey = asyncHandler(async (req, res) => {
  const project = await _ownedProject(req);
  if (project.settings) project.settings.anthropicApiKey = undefined;
  await project.save();
  res.json({ hasApiKey: false });
});

exports.setProjectGithubToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token?.startsWith('ghp_') && !token?.startsWith('github_pat_'))
    throw ApiError.badRequest('קוד גישה GitHub לא תקין — חייב להתחיל עם "ghp_" או "github_pat_"');
  const project = await _ownedProject(req);
  if (!project.settings) project.settings = {};
  project.settings.githubToken = encrypt(token);
  await project.save();
  res.json({ hasGithubToken: true, githubTokenHint: _maskKey(token) });
});

exports.deleteProjectGithubToken = asyncHandler(async (req, res) => {
  const project = await _ownedProject(req);
  if (project.settings) project.settings.githubToken = undefined;
  await project.save();
  res.json({ hasGithubToken: false });
});

exports.setProjectRenderToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw ApiError.badRequest('token required');
  const project = await _ownedProject(req);
  if (!project.settings) project.settings = {};
  project.settings.renderApiKey = encrypt(token);
  await project.save();
  res.json({ hasRenderToken: true, renderTokenHint: _maskKey(token) });
});

exports.deleteProjectRenderToken = asyncHandler(async (req, res) => {
  const project = await _ownedProject(req);
  if (project.settings) project.settings.renderApiKey = undefined;
  await project.save();
  res.json({ hasRenderToken: false });
});

// ── Dynamic service credentials ───────────────────────────────────────────────

exports.getRequiredServices = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const registry = require('../config/serviceRegistry');
  const services = (project.requiredServices || []).map((s) => ({
    id:                   s.serviceId,
    name:                 registry[s.serviceId]?.name  || s.serviceId,
    fields:               registry[s.serviceId]?.fields || [],
    howto:                registry[s.serviceId]?.howto  || '',
    credentialsProvided:  s.credentialsProvided,
  }));

  res.json({ services });
});

exports.saveServiceCredentials = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const { credentials } = req.body;

  if (!credentials || typeof credentials !== 'object') {
    throw ApiError.badRequest('credentials must be an object');
  }

  const registry = require('../config/serviceRegistry');
  if (!registry[serviceId]) throw ApiError.badRequest(`Unknown service: ${serviceId}`);

  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id })
    .select('+requiredServices.credentials');
  if (!project) throw ApiError.notFound('Project not found');

  // Upsert this service entry
  let svc = project.requiredServices.find((s) => s.serviceId === serviceId);
  if (!svc) {
    project.requiredServices.push({ serviceId, credentialsProvided: false });
    svc = project.requiredServices[project.requiredServices.length - 1];
  }

  if (!svc.credentials) svc.credentials = new Map();
  for (const [key, val] of Object.entries(credentials)) {
    if (typeof val === 'string' && val.trim()) {
      svc.credentials.set(key, encrypt(val.trim()));
    }
  }
  svc.credentialsProvided = true;
  await project.save();

  // If all required services now have credentials → resume codegen
  const allDone = project.requiredServices.every((s) => s.credentialsProvided);
  if (allDone && project.status === 'awaiting_credentials') {
    await Project.findByIdAndUpdate(req.params.id, { status: 'planning' });
    const { startCodegen } = require('../services/codegen-runner.service');
    startCodegen(req.params.id).catch((err) =>
      require('../utils/logger').error('projects.ctrl: codegen resume failed', { error: err.message }),
    );
  }

  res.json({ ok: true, credentialsProvided: true, allDone });
});

// ─────────────────────────────────────────────────────────────────────────────

async function _ownedProject(req) {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

function _maskKey(key) {
  if (!key || key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}
