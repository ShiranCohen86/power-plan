/**
 * Sprints 92-100, 121-130: project tags, pinning, bulk ops, notes, share, collaborators, transfer
 */
const asyncHandler           = require('../utils/asyncHandler');
const ApiError               = require('../utils/ApiError');
const Project                = require('../models/Project');
const ProjectCollaborator    = require('../models/ProjectCollaborator');
const shareService           = require('../services/share.service');
const notificationService    = require('../services/notification.service');
const logger                 = require('../utils/logger');
const crypto                 = require('crypto');

// ── Sprint 92: Tags ────────────────────────────────────────────────────────────

exports.updateTags = asyncHandler(async (req, res) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) throw ApiError.badRequest('tags must be an array');
  const cleaned = [...new Set(tags.map((t) => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 10);

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id, deletedAt: null },
    { tags: cleaned },
    { new: true },
  );
  if (!project) throw ApiError.notFound('Project not found');
  res.json({ tags: project.tags });
});

// ── Sprint 93: Pin ─────────────────────────────────────────────────────────────

exports.togglePin = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id, deletedAt: null });
  if (!project) throw ApiError.notFound('Project not found');
  project.isPinned = !project.isPinned;
  await project.save();
  res.json({ isPinned: project.isPinned });
});

// ── Sprint 94: Bulk operations ─────────────────────────────────────────────────

exports.bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) throw ApiError.badRequest('ids required');
  if (ids.length > 50) throw ApiError.badRequest('Max 50 projects per bulk operation');

  await Project.updateMany(
    { _id: { $in: ids }, ownerId: req.user.id, status: { $nin: ['planning', 'coding', 'deploying'] }, deletedAt: null },
    { deletedAt: new Date() },
  );
  res.json({ ok: true });
});

exports.bulkArchive = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) throw ApiError.badRequest('ids required');
  if (ids.length > 50) throw ApiError.badRequest('Max 50 projects per bulk operation');

  await Project.updateMany(
    { _id: { $in: ids }, ownerId: req.user.id, status: { $nin: ['planning', 'coding', 'deploying'] }, deletedAt: null },
    { status: 'archived' },
  );
  res.json({ ok: true });
});

// ── Sprint 97: Notes ───────────────────────────────────────────────────────────

exports.updateNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  if (typeof notes !== 'string') throw ApiError.badRequest('notes must be a string');

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id, deletedAt: null },
    { notes: notes.slice(0, 5000) },
    { new: true },
  );
  if (!project) throw ApiError.notFound('Project not found');
  res.json({ notes: project.notes });
});

// ── Sprint 117: Token budget ───────────────────────────────────────────────────

exports.updateTokenBudget = asyncHandler(async (req, res) => {
  const { tokenBudget } = req.body;
  if (typeof tokenBudget !== 'number' || tokenBudget < 0) throw ApiError.badRequest('tokenBudget must be a non-negative number');

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id, deletedAt: null },
    { tokenBudget },
    { new: true },
  );
  if (!project) throw ApiError.notFound('Project not found');
  res.json({ tokenBudget: project.tokenBudget });
});

// ── Sprint 121-122: Share link ─────────────────────────────────────────────────

exports.enableShare = asyncHandler(async (req, res) => {
  const result = await shareService.enableShare(req.params.id, req.user.id);
  res.json(result);
});

exports.disableShare = asyncHandler(async (req, res) => {
  const result = await shareService.disableShare(req.params.id, req.user.id);
  res.json(result);
});

exports.regenerateShareToken = asyncHandler(async (req, res) => {
  const result = await shareService.regenerateShareToken(req.params.id, req.user.id);
  res.json(result);
});

// ── Sprint 124-126: Collaborators ─────────────────────────────────────────────

exports.listCollaborators = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const collabs = await ProjectCollaborator.find({ projectId: req.params.id, status: { $ne: 'revoked' } })
    .sort({ createdAt: 1 }).lean();
  res.json(collabs);
});

exports.inviteCollaborator = asyncHandler(async (req, res) => {
  const { email, role = 'viewer' } = req.body;
  if (!email) throw ApiError.badRequest('email required');
  if (!['viewer', 'editor'].includes(role)) throw ApiError.badRequest('Invalid role');

  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const inviteToken = crypto.randomBytes(20).toString('base64url');
  const collab = await ProjectCollaborator.findOneAndUpdate(
    { projectId: req.params.id, email: email.toLowerCase() },
    { $set: { role, status: 'pending', invitedBy: req.user.id, inviteToken } },
    { upsert: true, new: true },
  );

  logger.info('project-extras: collaborator invited', { projectId: req.params.id, email, role });
  res.status(201).json({ email: collab.email, role: collab.role, status: collab.status });
});

exports.updateCollaboratorRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['viewer', 'editor'].includes(role)) throw ApiError.badRequest('Invalid role');

  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const collab = await ProjectCollaborator.findOneAndUpdate(
    { _id: req.params.collabId, projectId: req.params.id },
    { role },
    { new: true },
  );
  if (!collab) throw ApiError.notFound('Collaborator not found');
  res.json({ role: collab.role });
});

exports.revokeCollaborator = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  await ProjectCollaborator.findOneAndUpdate(
    { _id: req.params.collabId, projectId: req.params.id },
    { status: 'revoked' },
  );
  res.json({ ok: true });
});

// ── Sprint 130: Transfer ownership ────────────────────────────────────────────

exports.transferProject = asyncHandler(async (req, res) => {
  const { toEmail } = req.body;
  if (!toEmail) throw ApiError.badRequest('toEmail required');

  const User    = require('../models/User');
  const newOwner = await User.findOne({ email: toEmail.toLowerCase() }).lean();
  if (!newOwner) throw ApiError.notFound('User not found');
  if (String(newOwner._id) === String(req.user.id)) throw ApiError.badRequest('Cannot transfer to yourself');

  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id, deletedAt: null });
  if (!project) throw ApiError.notFound('Project not found');

  project.ownerId = newOwner._id;
  await project.save();

  await notificationService.create({
    userId:    newOwner._id,
    projectId: project._id,
    type:      'info',
    title:     'Project transferred to you',
    message:   `"${project.title}" has been transferred to your account.`,
  }).catch(() => {});

  res.json({ ok: true, newOwnerId: String(newOwner._id) });
});

// ── Sprint 136: Custom env vars ───────────────────────────────────────────────

exports.updateCustomEnvVars = asyncHandler(async (req, res) => {
  const { vars } = req.body;
  if (typeof vars !== 'object' || Array.isArray(vars)) throw ApiError.badRequest('vars must be an object');

  const sanitized = {};
  for (const [k, v] of Object.entries(vars)) {
    const key = String(k).replace(/[^A-Z0-9_]/gi, '_').toUpperCase().slice(0, 64);
    sanitized[key] = String(v).slice(0, 512);
  }
  if (Object.keys(sanitized).length > 50) throw ApiError.badRequest('Max 50 env vars');

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id, deletedAt: null },
    { customEnvVars: sanitized },
    { new: true },
  );
  if (!project) throw ApiError.notFound('Project not found');
  res.json({ customEnvVars: Object.fromEntries(project.customEnvVars) });
});
