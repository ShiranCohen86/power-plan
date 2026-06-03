const Phase   = require('../models/Phase');
const Project = require('../models/Project');
const logger  = require('../utils/logger');

// Anthropic token pricing (claude-sonnet-4-6 as of 2026)
const PRICE_PER_INPUT_TOKEN  = 0.000003;   // $3 / 1M input
const PRICE_PER_OUTPUT_TOKEN = 0.000015;   // $15 / 1M output
const AVG_OUTPUT_RATIO       = 0.25;       // rough estimate: 25% output tokens

function tokensToUSD(tokens) {
  const inputCost  = tokens * (1 - AVG_OUTPUT_RATIO) * PRICE_PER_INPUT_TOKEN;
  const outputCost = tokens * AVG_OUTPUT_RATIO        * PRICE_PER_OUTPUT_TOKEN;
  return parseFloat((inputCost + outputCost).toFixed(4));
}

/**
 * Per-user usage breakdown: today / this week / this month / all-time
 * plus per-project cost.
 */
async function getUserUsage(userId) {
  const now      = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const projects = await Project.find({ ownerId: userId, deletedAt: null }).select('_id title').lean();
  const projectIds = projects.map((p) => p._id);

  if (!projectIds.length) {
    return { today: 0, week: 0, month: 0, allTime: 0, usdAllTime: 0, byProject: [], daily: [] };
  }

  const [today, week, month, allTime, byProjectRaw, dailyRaw] = await Promise.all([
    Phase.aggregate([
      { $match: { projectId: { $in: projectIds }, completedAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
    ]),
    Phase.aggregate([
      { $match: { projectId: { $in: projectIds }, completedAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
    ]),
    Phase.aggregate([
      { $match: { projectId: { $in: projectIds }, completedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
    ]),
    Phase.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
    ]),
    Phase.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$projectId', tokens: { $sum: '$tokensUsed' } } },
    ]),
    Phase.aggregate([
      { $match: { projectId: { $in: projectIds }, completedAt: { $gte: weekStart } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        tokens: { $sum: '$tokensUsed' },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  const projectMap = new Map(projects.map((p) => [String(p._id), p.title]));
  const byProject  = byProjectRaw.map((r) => ({
    projectId: String(r._id),
    title:     projectMap.get(String(r._id)) || 'Unknown',
    tokens:    r.tokens,
    usd:       tokensToUSD(r.tokens),
  })).sort((a, b) => b.tokens - a.tokens);

  const allTimeTotal = allTime[0]?.total || 0;

  return {
    today:      today[0]?.total  || 0,
    week:       week[0]?.total   || 0,
    month:      month[0]?.total  || 0,
    allTime:    allTimeTotal,
    usdAllTime: tokensToUSD(allTimeTotal),
    byProject,
    daily:      dailyRaw.map((d) => ({ date: d._id, tokens: d.tokens })),
  };
}

/**
 * Admin: all users' usage summary for the current month.
 */
async function getAllUsersUsage() {
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const rows = await Phase.aggregate([
    { $match: { completedAt: { $gte: monthStart } } },
    { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'proj' } },
    { $unwind: '$proj' },
    { $group: {
      _id:    '$proj.ownerId',
      tokens: { $sum: '$tokensUsed' },
      phases: { $sum: 1 },
    }},
    { $sort: { tokens: -1 } },
    { $limit: 100 },
  ]);

  const User  = require('../models/User');
  const uids  = rows.map((r) => r._id);
  const users = await User.find({ _id: { $in: uids } }).select('name email plan').lean();
  const umap  = new Map(users.map((u) => [String(u._id), u]));

  return rows.map((r) => {
    const u = umap.get(String(r._id)) || {};
    return { userId: String(r._id), name: u.name, email: u.email, plan: u.plan, tokens: r.tokens, usd: tokensToUSD(r.tokens), phases: r.phases };
  });
}

/**
 * Update project's running token total after each phase completes.
 * Fire-and-forget — called from planning/codegen runners.
 */
async function syncProjectTokens(projectId) {
  try {
    const agg = await Phase.aggregate([
      { $match: { projectId: require('mongoose').Types.ObjectId.createFromHexString
        ? require('mongoose').Types.ObjectId.createFromHexString(String(projectId))
        : new (require('mongoose').Types.ObjectId)(String(projectId)) } },
      { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
    ]);
    const total = agg[0]?.total || 0;
    await Project.findByIdAndUpdate(projectId, { totalTokensUsed: total });
    // S118: check budget alert after syncing
    checkBudgetAlert(projectId).catch(() => {});
  } catch (err) {
    logger.warn('usage.service: syncProjectTokens failed', { projectId, error: err.message });
  }
}

/** True if project has exceeded its token budget (0 = unlimited). */
async function isOverBudget(projectId) {
  const project = await Project.findById(projectId).select('tokenBudget totalTokensUsed').lean();
  if (!project || !project.tokenBudget) return false;
  return project.totalTokensUsed >= project.tokenBudget;
}

/**
 * S118: Check project token budget and fire notification at 80%.
 * Called after each phase completes in syncProjectTokens.
 */
async function checkBudgetAlert(projectId) {
  try {
    const project = await Project.findById(projectId)
      .select('tokenBudget totalTokensUsed ownerId title _budgetAlerted80')
      .lean();
    if (!project || !project.tokenBudget) return;

    const pct = (project.totalTokensUsed / project.tokenBudget) * 100;
    if (pct >= 80 && pct < 100 && !project._budgetAlerted80) {
      const Notification = require('../models/Notification');
      await Notification.create({
        userId:    project.ownerId,
        projectId: project._id,
        type:      'warning',
        title:     'Token budget at 80%',
        message:   `"${project.title}" has used ${Math.round(pct)}% of its token budget (${project.totalTokensUsed.toLocaleString()} / ${project.tokenBudget.toLocaleString()} tokens).`,
      });
      // Mark alerted so we don't spam
      await Project.findByIdAndUpdate(projectId, { _budgetAlerted80: true });
    }
  } catch (err) {
    logger.warn('usage.service: checkBudgetAlert failed', { projectId, error: err.message });
  }
}

/**
 * S115: Check if user's monthly usage is at 80%+ of a soft limit.
 * Returns { warned, pct, monthTokens, softLimit }
 */
async function checkMonthlyQuotaWarning(userId) {
  const MONTHLY_SOFT_LIMIT = 500_000; // 500k tokens/month soft limit for starter
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const User    = require('../models/User');
  const user    = await User.findById(userId).select('plan').lean();
  if (user?.plan !== 'starter') return { warned: false };

  const projects = await Project.find({ ownerId: userId, deletedAt: null }).select('_id').lean();
  const projectIds = projects.map((p) => p._id);
  if (!projectIds.length) return { warned: false };

  const agg = await Phase.aggregate([
    { $match: { projectId: { $in: projectIds }, completedAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
  ]);
  const monthTokens = agg[0]?.total || 0;
  const pct = (monthTokens / MONTHLY_SOFT_LIMIT) * 100;

  return { warned: pct >= 80, pct: Math.round(pct), monthTokens, softLimit: MONTHLY_SOFT_LIMIT };
}

module.exports = {
  getUserUsage, getAllUsersUsage, syncProjectTokens, isOverBudget, tokensToUSD,
  checkBudgetAlert, checkMonthlyQuotaWarning,
};
