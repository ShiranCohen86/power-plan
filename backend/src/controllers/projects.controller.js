const asyncHandler = require('../utils/asyncHandler');
const projectService = require('../services/project.service');
const discoveryService = require('../services/discovery.service');
const User = require('../models/User');
const { decrypt } = require('../services/encryption.service');

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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Fetch user's own API key (select: false field needs explicit select)
  const user = await User.findById(req.user.id).select('+settings.anthropicApiKey');
  const userApiKey = user?.settings?.anthropicApiKey
    ? decrypt(user.settings.anthropicApiKey)
    : null;

  if (!userApiKey) {
    res.write(`data: ${JSON.stringify({ error: 'לא הוגדר מפתח Anthropic. עבור להגדרות והזן את המפתח שלך.' })}\n\n`);
    res.end();
    return;
  }

  try {
    await discoveryService.streamNextQuestion(res, {
      idea:       project.idea,
      title:      project.title,
      answers:    req.body.answers || [],
      userPlan:   user.plan,
      userApiKey,
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: friendlyAIError(err) })}\n\n`);
    res.end();
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
