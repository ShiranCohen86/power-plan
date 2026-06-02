const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const Project      = require('../models/Project');
const User         = require('../models/User');
const mongoose     = require('mongoose');
const { encrypt, decrypt } = require('../services/encryption.service');

function maskKey(key) {
  if (!key || key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

async function ownedProject(req) {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

exports.getProjectSettings = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id })
    .select('+settings.anthropicApiKey +settings.githubToken +settings.renderApiKey');
  if (!project) throw ApiError.notFound('Project not found');

  const user        = await User.findById(req.user.id).select('+settings.anthropicApiKey').lean();
  const s           = project.settings || {};
  const safeDecrypt = (val) => { try { return val ? maskKey(decrypt(val)) : null; } catch { return null; } };

  const hasProjectKey = !!(s.anthropicApiKey);
  const hasUserKey    = !!(user?.settings?.anthropicApiKey);

  res.json({
    hasApiKey:        hasProjectKey || hasUserKey,
    hasProjectApiKey: hasProjectKey,
    usingFallback:    !hasProjectKey && hasUserKey,
    hasGithubToken:   !!(s.githubToken),
    hasRenderToken:   !!(s.renderApiKey),
    apiKeyHint:       safeDecrypt(s.anthropicApiKey),
    githubTokenHint:  safeDecrypt(s.githubToken),
    renderTokenHint:  safeDecrypt(s.renderApiKey),
  });
});

exports.setProjectApiKey = asyncHandler(async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey?.startsWith('sk-ant-') || apiKey.length < 40) {
    throw ApiError.badRequest('Invalid API key — must start with "sk-ant-" and be full length');
  }
  const project = await ownedProject(req);
  if (!project.settings) project.settings = {};
  project.settings.anthropicApiKey = encrypt(apiKey);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await project.save({ session });
    await User.findByIdAndUpdate(
      req.user.id,
      { $set: { 'settings.anthropicApiKey': encrypt(apiKey) } },
      { session },
    );
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
  res.json({ hasApiKey: true, apiKeyHint: maskKey(apiKey) });
});

exports.deleteProjectApiKey = asyncHandler(async (req, res) => {
  const project = await ownedProject(req);
  if (project.settings) project.settings.anthropicApiKey = undefined;
  await project.save();
  res.json({ hasApiKey: false });
});

exports.setProjectGithubToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token?.startsWith('ghp_') && !token?.startsWith('github_pat_')) {
    throw ApiError.badRequest('Invalid GitHub token — must start with "ghp_" or "github_pat_"');
  }
  const project = await ownedProject(req);
  if (!project.settings) project.settings = {};
  project.settings.githubToken = encrypt(token);
  await project.save();
  res.json({ hasGithubToken: true, githubTokenHint: maskKey(token) });
});

exports.deleteProjectGithubToken = asyncHandler(async (req, res) => {
  const project = await ownedProject(req);
  if (project.settings) project.settings.githubToken = undefined;
  await project.save();
  res.json({ hasGithubToken: false });
});

exports.setProjectRenderToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw ApiError.badRequest('token required');
  const project = await ownedProject(req);
  if (!project.settings) project.settings = {};
  project.settings.renderApiKey = encrypt(token);
  await project.save();
  res.json({ hasRenderToken: true, renderTokenHint: maskKey(token) });
});

exports.deleteProjectRenderToken = asyncHandler(async (req, res) => {
  const project = await ownedProject(req);
  if (project.settings) project.settings.renderApiKey = undefined;
  await project.save();
  res.json({ hasRenderToken: false });
});
