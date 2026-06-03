/**
 * Sprints 137-138: public REST API with API key auth
 */
const asyncHandler   = require('../utils/asyncHandler');
const ApiError       = require('../utils/ApiError');
const Project        = require('../models/Project');
const Phase          = require('../models/Phase');
const PublicApiKey   = require('../models/PublicApiKey');
const crypto         = require('crypto');
const bcrypt         = require('bcryptjs');

// ── API key management ─────────────────────────────────────────────────────────

exports.listApiKeys = asyncHandler(async (req, res) => {
  const keys = await PublicApiKey.find({ userId: req.user.id, isActive: true }).lean();
  res.json(keys);
});

exports.createApiKey = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) throw ApiError.badRequest('name required');

  const count = await PublicApiKey.countDocuments({ userId: req.user.id, isActive: true });
  if (count >= 10) throw ApiError.badRequest('Max 10 API keys');

  const raw     = `ppk_${crypto.randomBytes(32).toString('base64url')}`;
  const prefix  = raw.slice(0, 12);
  const keyHash = await bcrypt.hash(raw, 10);

  const key = await PublicApiKey.create({
    userId:  req.user.id,
    name:    name.trim().slice(0, 64),
    keyHash,
    prefix,
  });

  // Return the raw key only once — never stored in plaintext
  res.status(201).json({ id: key._id, name: key.name, prefix: key.prefix, key: raw });
});

exports.revokeApiKey = asyncHandler(async (req, res) => {
  await PublicApiKey.findOneAndUpdate(
    { _id: req.params.keyId, userId: req.user.id },
    { isActive: false },
  );
  res.json({ ok: true });
});

// ── Public endpoints (authenticated via X-Api-Key header) ─────────────────────

async function _authApiKey(req) {
  const raw = req.headers['x-api-key'];
  if (!raw) throw ApiError.unauthorized('X-Api-Key header required');

  const prefix = raw.slice(0, 12);
  const keys   = await PublicApiKey.find({ prefix, isActive: true }).select('+keyHash').lean();

  for (const k of keys) {
    const match = await bcrypt.compare(raw, k.keyHash);
    if (match) {
      await PublicApiKey.findByIdAndUpdate(k._id, { lastUsedAt: new Date() }).catch(() => {});
      return k.userId;
    }
  }
  throw ApiError.unauthorized('Invalid API key');
}

exports.publicGetProject = asyncHandler(async (req, res) => {
  const userId  = await _authApiKey(req);
  const project = await Project.findOne({ _id: req.params.id, ownerId: userId, deletedAt: null })
    .select('title status completionPercent deployedUrl createdAt updatedAt totalTokensUsed')
    .lean();
  if (!project) throw ApiError.notFound('Project not found');
  res.json(project);
});

exports.publicListProjects = asyncHandler(async (req, res) => {
  const userId   = await _authApiKey(req);
  const projects = await Project.find({ ownerId: userId, deletedAt: null })
    .select('title status completionPercent deployedUrl createdAt updatedAt')
    .sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items: projects, total: projects.length });
});

exports.publicGetPhases = asyncHandler(async (req, res) => {
  const userId  = await _authApiKey(req);
  const project = await Project.findOne({ _id: req.params.id, ownerId: userId, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const phases = await Phase.find({ projectId: req.params.id })
    .select('type index status tokensUsed startedAt completedAt')
    .sort({ index: 1 }).lean();
  res.json(phases);
});
