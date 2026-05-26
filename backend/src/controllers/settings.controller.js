const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const User         = require('../models/User');
const { encrypt, decrypt } = require('../services/encryption.service');

// GET /api/settings
exports.getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('+settings.anthropicApiKey +settings.githubToken +settings.renderApiKey')
    .lean();

  const s = user.settings || {};
  res.json({
    plan:            user.plan,
    hasApiKey:       !!(s.anthropicApiKey),
    hasGithubToken:  !!(s.githubToken),
    hasRenderToken:  !!(s.renderApiKey),
    apiKeyHint:      s.anthropicApiKey ? _maskKey(decrypt(s.anthropicApiKey)) : null,
    githubTokenHint: s.githubToken     ? _maskKey(decrypt(s.githubToken))     : null,
    renderTokenHint: s.renderApiKey    ? _maskKey(decrypt(s.renderApiKey))    : null,
  });
});

// PUT /api/settings/plan
exports.updatePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!plan || !['starter', 'pro'].includes(plan)) throw ApiError.badRequest('plan must be starter or pro');

  const user = await User.findById(req.user.id).select('+settings.anthropicApiKey');

  if (plan === 'starter' && !user.settings?.anthropicApiKey) {
    throw ApiError.badRequest('כדי להשתמש בתוכנית Starter עליך קודם להזין מפתח API אישי.');
  }

  user.plan = plan;
  await user.save();
  res.json({ plan: user.plan });
});

// PUT /api/settings/api-key
exports.updateApiKey = asyncHandler(async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') throw ApiError.badRequest('apiKey required');

  if (!apiKey.startsWith('sk-ant-')) {
    throw ApiError.badRequest('מפתח API לא תקין — צריך להתחיל עם "sk-ant-"');
  }

  const user = await User.findById(req.user.id);
  if (!user.settings) user.settings = {};
  user.settings.anthropicApiKey = encrypt(apiKey);
  await user.save();

  res.json({ hasApiKey: true, apiKeyHint: _maskKey(apiKey) });
});

// DELETE /api/settings/api-key
exports.deleteApiKey = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.settings) user.settings.anthropicApiKey = undefined;
  if (user.plan === 'starter') user.plan = 'pro';
  await user.save();
  res.json({ hasApiKey: false, plan: user.plan });
});

// PUT /api/settings/github-token
exports.updateGithubToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') throw ApiError.badRequest('token required');

  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    throw ApiError.badRequest('קוד גישה GitHub לא תקין — צריך להתחיל עם "ghp_" או "github_pat_"');
  }

  const user = await User.findById(req.user.id);
  if (!user.settings) user.settings = {};
  user.settings.githubToken = encrypt(token);
  await user.save();

  res.json({ hasGithubToken: true, githubTokenHint: _maskKey(token) });
});

// DELETE /api/settings/github-token
exports.deleteGithubToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.settings) user.settings.githubToken = undefined;
  await user.save();
  res.json({ hasGithubToken: false });
});

// PUT /api/settings/render-token
exports.updateRenderToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') throw ApiError.badRequest('token required');

  const user = await User.findById(req.user.id);
  if (!user.settings) user.settings = {};
  user.settings.renderApiKey = encrypt(token);
  await user.save();

  res.json({ hasRenderToken: true, renderTokenHint: _maskKey(token) });
});

// DELETE /api/settings/render-token
exports.deleteRenderToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.settings) user.settings.renderApiKey = undefined;
  await user.save();
  res.json({ hasRenderToken: false });
});

function _maskKey(key) {
  if (!key || key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}
