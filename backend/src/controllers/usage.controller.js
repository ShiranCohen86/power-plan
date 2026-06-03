/**
 * Sprints 111-120: usage analytics, cost tracking, quota management
 */
const asyncHandler    = require('../utils/asyncHandler');
const ApiError        = require('../utils/ApiError');
const usageService    = require('../services/usage.service');
const notifService    = require('../services/notification.service');
const Project         = require('../models/Project');
const User            = require('../models/User');

// Sprint 111: per-user usage dashboard
exports.getMyUsage = asyncHandler(async (req, res) => {
  const data = await usageService.getUserUsage(req.user.id);
  res.json(data);
});

// Sprint 116: admin — all users' usage
exports.getAllUsersUsage = asyncHandler(async (req, res) => {
  const data = await usageService.getAllUsersUsage();
  res.json(data);
});

// Sprint 95: dashboard stats widget
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const Project = require('../models/Project');
  const [total, live, active, failed] = await Promise.all([
    Project.countDocuments({ ownerId: req.user.id, deletedAt: null }),
    Project.countDocuments({ ownerId: req.user.id, status: 'live', deletedAt: null }),
    Project.countDocuments({ ownerId: req.user.id, status: { $in: ['planning', 'coding', 'deploying'] }, deletedAt: null }),
    Project.countDocuments({ ownerId: req.user.id, status: 'failed', deletedAt: null }),
  ]);
  res.json({ total, live, active, failed });
});

// Sprint 105: pipeline cost estimate
exports.getCostEstimate = asyncHandler(async (req, res) => {
  const Phase = require('../models/Phase');
  const agg   = await Phase.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, avgTokensPerPhase: { $avg: '$tokensUsed' }, count: { $sum: 1 } } },
  ]);
  const avgPerPhase   = agg[0]?.avgTokensPerPhase || 4000;
  const totalPhases   = 19; // 12 planning + 1 db-schema + 6 codegen
  const estimatedTokens = Math.round(avgPerPhase * totalPhases);
  const estimatedUSD    = usageService.tokensToUSD(estimatedTokens);
  res.json({ estimatedTokens, estimatedUSD, avgTokensPerPhase: Math.round(avgPerPhase), totalPhases });
});

// Sprint 119: free tier pipeline count check
exports.checkFreeTierLimit = asyncHandler(async (req, res) => {
  const FREE_TIER_MONTHLY_LIMIT = 3;
  const user = await User.findById(req.user.id).select('plan').lean();
  if (user?.plan !== 'starter') return res.json({ ok: true, remaining: null });

  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const count = await Project.countDocuments({
    ownerId:   req.user.id,
    createdAt: { $gte: monthStart },
    status:    { $ne: 'onboarding' },
    deletedAt: null,
  });

  const remaining = Math.max(0, FREE_TIER_MONTHLY_LIMIT - count);
  res.json({ ok: remaining > 0, remaining, limit: FREE_TIER_MONTHLY_LIMIT, plan: 'starter' });
});
