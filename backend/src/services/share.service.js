const crypto  = require('crypto');
const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

function _generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

async function enableShare(projectId, ownerId) {
  const project = await Project.findOne({ _id: projectId, ownerId, deletedAt: null });
  if (!project) throw ApiError.notFound('Project not found');

  if (!project.shareToken) project.shareToken = _generateToken();
  project.shareEnabled = true;
  await project.save();
  return { shareToken: project.shareToken, shareEnabled: true };
}

async function disableShare(projectId, ownerId) {
  const project = await Project.findOne({ _id: projectId, ownerId, deletedAt: null });
  if (!project) throw ApiError.notFound('Project not found');
  project.shareEnabled = false;
  await project.save();
  return { shareEnabled: false };
}

async function regenerateShareToken(projectId, ownerId) {
  const project = await Project.findOne({ _id: projectId, ownerId, deletedAt: null });
  if (!project) throw ApiError.notFound('Project not found');
  project.shareToken   = _generateToken();
  project.shareEnabled = true;
  await project.save();
  return { shareToken: project.shareToken, shareEnabled: true };
}

/** Resolve a shared project from a public share token (read-only, no auth required). */
async function getSharedProject(shareToken) {
  const project = await Project.findOne({ shareToken, shareEnabled: true, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Share link not found or disabled');
  return project;
}

module.exports = { enableShare, disableShare, regenerateShareToken, getSharedProject };
