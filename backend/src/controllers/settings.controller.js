const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const User         = require('../models/User');
const { encrypt, decrypt } = require('../services/encryption.service');
const Anthropic    = require('@anthropic-ai/sdk');
const env          = require('../config/env');
const { RATE_LIMIT_STARTS_PER_HOUR } = require('../config/constants');

const HOUR_MS = 60 * 60 * 1000;

// GET /api/settings
exports.getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('+settings.anthropicApiKey +settings.githubToken +settings.renderApiKey')
    .lean();

  const s = user.settings || {};
  const safeDecrypt = (val) => { try { return val ? _maskKey(decrypt(val)) : null; } catch { return null; } };
  res.json({
    plan:            user.plan,
    hasApiKey:       !!(s.anthropicApiKey),
    hasGithubToken:  !!(s.githubToken),
    hasRenderToken:  !!(s.renderApiKey),
    apiKeyHint:      safeDecrypt(s.anthropicApiKey),
    githubTokenHint: safeDecrypt(s.githubToken),
    renderTokenHint: safeDecrypt(s.renderApiKey),
    totpEnabled:     !!(user.totpEnabled),
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

  if (!apiKey.startsWith('sk-ant-') || apiKey.length < 40) {
    throw ApiError.badRequest('מפתח API לא תקין — צריך להתחיל עם "sk-ant-" ולהיות באורך מלא');
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
    throw ApiError.badRequest('Invalid GitHub token — must start with "ghp_" or "github_pat_"');
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

// GET /api/settings/rate-limit
// Returns how many pipeline starts the user has used this hour and how many remain.
exports.getRateLimit = asyncHandler(async (req, res) => {
  const now    = Date.now();
  const cutoff = new Date(now - HOUR_MS);

  const user   = await User.findById(req.user.id).select('+pipelineStarts').lean();
  const recent = (user?.pipelineStarts || []).filter((t) => new Date(t) > cutoff).sort((a, b) => a - b);

  const used      = recent.length;
  const remaining = Math.max(0, RATE_LIMIT_STARTS_PER_HOUR - used);
  const resetsAt  = recent[0] ? new Date(new Date(recent[0]).getTime() + HOUR_MS) : null;

  res.json({ used, remaining, maxPerHour: RATE_LIMIT_STARTS_PER_HOUR, resetsAt });
});

// POST /api/settings/validate-key
// Body: { apiKey: 'sk-ant-...' }
// Makes a minimal Anthropic API call to confirm the key is live; returns { valid, error? }
exports.validateApiKey = asyncHandler(async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey?.startsWith('sk-ant-')) {
    return res.json({ valid: false, error: 'מפתח לא תקין — חייב להתחיל עם sk-ant-' });
  }
  try {
    const client = new Anthropic({ apiKey });
    // Cheapest possible call: 1 input token, 1 output token
    await client.messages.create({
      model:      env.ANTHROPIC_MODEL_STARTER,
      max_tokens: 1,
      messages:   [{ role: 'user', content: 'hi' }],
    });
    res.json({ valid: true });
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('authentication') || msg.includes('invalid') || msg.includes('401')) {
      res.json({ valid: false, error: 'מפתח לא תקין — בדוק שהעתקת נכון' });
    } else if (msg.includes('credit') || msg.includes('billing') || msg.includes('balance')) {
      res.json({ valid: false, error: 'מפתח תקין אך אין קרדיט — טען קרדיט ב-console.anthropic.com' });
    } else {
      res.json({ valid: false, error: 'לא ניתן לאמת את המפתח כעת — נסה שוב' });
    }
  }
});

function _maskKey(key) {
  if (!key || key.length < 16) return '***';
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

exports.getNotifPrefs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) throw ApiError.notFound('User not found');
  const prefs = user.notifPrefs || {};
  res.json({
    deploymentSuccess: prefs.deploymentSuccess !== false,
    quotaExhausted:    prefs.quotaExhausted    !== false,
    phaseFailed:       prefs.phaseFailed       !== false,
    planningComplete:  prefs.planningComplete  !== false,
  });
});

exports.updateNotifPrefs = asyncHandler(async (req, res) => {
  const KEYS = ['deploymentSuccess', 'quotaExhausted', 'phaseFailed', 'planningComplete'];
  const update = {};
  for (const k of KEYS) {
    if (typeof req.body[k] === 'boolean') update[`notifPrefs.${k}`] = req.body[k];
  }
  await User.updateOne({ _id: req.user.id }, { $set: update });
  res.json({ ok: true });
});
