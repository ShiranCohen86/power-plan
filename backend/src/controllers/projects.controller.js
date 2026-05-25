const asyncHandler = require('../utils/asyncHandler');
const projectService = require('../services/project.service');
const discoveryService = require('../services/discovery.service');

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

  try {
    await discoveryService.streamNextQuestion(res, {
      idea:    project.idea,
      title:   project.title,
      answers: req.body.answers || [],
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
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
