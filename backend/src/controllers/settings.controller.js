const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const User         = require('../models/User');
const { encrypt, decrypt } = require('../services/encryption.service');

// GET /api/settings
exports.getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+settings.anthropicApiKey').lean();
  res.json({
    plan:          user.plan,
    hasApiKey:     !!(user.settings?.anthropicApiKey),
    // Return masked key hint so frontend can show "sk-ant-...****"
    apiKeyHint:    user.settings?.anthropicApiKey
      ? _maskKey(decrypt(user.settings.anthropicApiKey))
      : null,
  });
});

// PUT /api/settings/plan
exports.updatePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!plan || !['starter', 'pro'].includes(plan)) throw ApiError.badRequest('plan must be starter or pro');

  const user = await User.findById(req.user.id).select('+settings.anthropicApiKey');

  // Starter requires an API key
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

  // Basic Anthropic key format check
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
  // Downgrade to pro if they delete their key (can't use starter without key)
  if (user.plan === 'starter') user.plan = 'pro';
  await user.save();
  res.json({ hasApiKey: false, plan: user.plan });
});

function _maskKey(key) {
  if (!key || key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}
