const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const projectService = require('../services/project.service');
const discoveryService = require('../services/discovery.service');
const Project = require('../models/Project');
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

exports.list = asyncHandler(async (req, res) => {
  const projects = await projectService.listByOwner(req.user.id);
  res.json({ items: projects });
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

  // Re-fetch project with encrypted key field
  const projectWithKey = await Project.findById(req.params.id).select('+settings.anthropicApiKey');
  let apiKey = null;
  if (projectWithKey?.settings?.anthropicApiKey) {
    try {
      apiKey = decrypt(projectWithKey.settings.anthropicApiKey);
    } catch {
      cleanup();
      res.write(`data: ${JSON.stringify({ error: 'שגיאה בקריאת מפתח ה-API — נסה להכניס מחדש בהגדרות הפרויקט.' })}\n\n`);
      res.end();
      return;
    }
  }

  if (!apiKey) {
    cleanup();
    res.write(`data: ${JSON.stringify({ error: 'לא הוגדר מפתח Anthropic לפרויקט זה. הכנס מפתח בהגדרות הפרויקט.' })}\n\n`);
    res.end();
    return;
  }

  try {
    await discoveryService.streamNextQuestion(res, {
      idea:       project.idea,
      title:      project.title,
      answers:    answers || [],
      userPlan:   'starter',
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

// ── Per-project settings ───────────────────────────────────────────────────

exports.getProjectSettings = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id })
    .select('+settings.anthropicApiKey +settings.githubToken +settings.renderApiKey');
  if (!project) throw ApiError.notFound('Project not found');

  const s = project.settings || {};
  const safeDecrypt = (val) => { try { return val ? _maskKey(decrypt(val)) : null; } catch { return null; } };
  res.json({
    hasApiKey:       !!(s.anthropicApiKey),
    hasGithubToken:  !!(s.githubToken),
    hasRenderToken:  !!(s.renderApiKey),
    apiKeyHint:      safeDecrypt(s.anthropicApiKey),
    githubTokenHint: safeDecrypt(s.githubToken),
    renderTokenHint: safeDecrypt(s.renderApiKey),
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

async function _ownedProject(req) {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

function _maskKey(key) {
  if (!key || key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}
