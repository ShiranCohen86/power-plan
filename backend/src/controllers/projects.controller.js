const asyncHandler       = require('../utils/asyncHandler');
const ApiError           = require('../utils/ApiError');
const projectService     = require('../services/project.service');
const discoveryService   = require('../services/discovery.service');
const Project            = require('../models/Project');
const User               = require('../models/User');
const Meeting            = require('../models/Meeting');
const MeetingMessage     = require('../models/MeetingMessage');
const { decrypt }        = require('../services/encryption.service');
const {
  DISCOVERY_TIMEOUT_MS, MAX_DISCOVERY_ANSWERS,
  MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE,
} = require('../config/constants');

function friendlyAIError(err) {
  const raw = err.message || '';
  try {
    const jsonStart = raw.indexOf('{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(raw.slice(jsonStart));
      const msg    = parsed?.error?.message || '';
      if (msg.includes('credit balance') || msg.includes('too low')) {
        return 'אין מספיק קרדיט ב-API. הכנס מפתח Anthropic אישי בהגדרות (Starter Plan) או טען קרדיט לחשבון הפלטפורמה.';
      }
      if (msg) return msg;
    }
  } catch { /* not JSON */ }
  if (raw.includes('credit') || raw.includes('billing')) {
    return 'אין מספיק קרדיט ב-API. הכנס מפתח Anthropic אישי בהגדרות.';
  }
  return 'שגיאה בתקשורת עם ה-AI. אנא נסה שוב.';
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

exports.create = asyncHandler(async (req, res) => {
  const project = await projectService.create({ ...req.body, ownerId: req.user.id });
  res.status(201).json(project);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id);
  res.status(204).end();
});

exports.restoreProject = asyncHandler(async (req, res) => {
  const project = await projectService.restoreProject(req.params.id, req.user.id);
  res.json(project);
});

const VALID_SORTS = new Set(['date', 'status', 'completion']);

exports.list = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit  = Math.min(MAX_PAGE_SIZE, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE);
  const search = (req.query.search || '').slice(0, 100);
  const sort   = VALID_SORTS.has(req.query.sort) ? req.query.sort : 'date';
  const result = await projectService.listByOwner(req.user.id, { page, limit, search, sort });
  res.json(result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id, req.user.id);
  res.json(project);
});

// ── Discovery ─────────────────────────────────────────────────────────────────

exports.discoveryNext = asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id, req.user.id);
  if (project.status !== 'onboarding') {
    return res.status(400).json({ error: 'Discovery already completed' });
  }

  const answers = req.body.answers;
  if (answers !== undefined) {
    if (!Array.isArray(answers) || answers.length > MAX_DISCOVERY_ANSWERS) {
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

  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  const timeout = setTimeout(() => {
    abortController.abort();
    if (!res.writableEnded) res.end();
  }, DISCOVERY_TIMEOUT_MS);

  const resolvedKey = await _resolveApiKey(req.params.id, req.user.id);
  if (!resolvedKey) {
    clearTimeout(timeout);
    res.write(`data: ${JSON.stringify({ error: 'לא הוגדר מפתח Anthropic. הכנס מפתח בהגדרות הפרויקט או בהגדרות הכלליות.' })}\n\n`);
    res.end();
    return;
  }

  const reqUser = await User.findById(req.user.id).select('plan').lean();

  try {
    await discoveryService.streamNextQuestion(res, {
      idea:       project.idea,
      title:      project.title,
      answers:    answers || [],
      userPlan:   reqUser?.plan || 'starter',
      userApiKey: resolvedKey,
    }, abortController.signal);
  } catch (err) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: friendlyAIError(err) })}\n\n`);
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
});

exports.discoveryProgress = asyncHandler(async (req, res) => {
  const project = await projectService.saveDiscoveryProgress(
    req.params.id, req.user.id, req.body.answers,
  );
  res.json(project);
});

exports.discoveryComplete = asyncHandler(async (req, res) => {
  const project = await projectService.saveDiscoveryAnswers(
    req.params.id, req.user.id, req.body.answers,
  );
  res.json(project);
});

// ── Meetings ──────────────────────────────────────────────────────────────────

exports.getMeetings = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const meetings = await Meeting.find({ projectId: req.params.id }).sort('startedAt').lean();
  if (!meetings.length) return res.json([]);

  const meetingIds = meetings.map((m) => m._id);
  const messages   = await MeetingMessage.find({ meetingId: { $in: meetingIds } }).sort('timestamp').lean();

  const grouped = meetings.map((m) => ({
    phaseIndex:   m.type,
    meetingId:    String(m._id),
    participants: m.participants,
    startedAt:    m.startedAt,
    messages:     [],
  }));
  const groupedById = new Map(grouped.map((g) => [g.meetingId, g]));

  for (const msg of messages) {
    const g = groupedById.get(String(msg.meetingId));
    if (g) g.messages.push({
      role: msg.role, displayName: msg.displayName,
      color: msg.color, message: msg.message, type: msg.type,
    });
  }

  res.json(grouped.filter((g) => g.messages.length > 0));
});

// ── Private helpers ───────────────────────────────────────────────────────────

async function _resolveApiKey(projectId, userId) {
  const [projectWithKey, user] = await Promise.all([
    Project.findById(projectId).select('+settings.anthropicApiKey'),
    User.findById(userId).select('+settings.anthropicApiKey').lean(),
  ]);

  if (projectWithKey?.settings?.anthropicApiKey) {
    try { return decrypt(projectWithKey.settings.anthropicApiKey); } catch { /* invalid */ }
  }
  if (user?.settings?.anthropicApiKey) {
    try { return decrypt(user.settings.anthropicApiKey); } catch { /* invalid */ }
  }
  return null;
}
