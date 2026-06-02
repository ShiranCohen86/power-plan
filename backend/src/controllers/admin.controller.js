const Lesson        = require('../models/Lesson');
const Phase         = require('../models/Phase');
const Project       = require('../models/Project');
const User          = require('../models/User');
const GeneratedFile = require('../models/GeneratedFile');
const AgentLog      = require('../models/AgentLog');
const asyncHandler  = require('../utils/asyncHandler');
const { ACTIVITY_PAGE_SIZE } = require('../config/constants');

const ADMIN_ACTIVITY_MAX_LIMIT = 100;

// ── Lessons CRUD (admin only) ─────────────────────────────────────────────────

exports.listLessons = asyncHandler(async (req, res) => {
  const { agentType, category, active } = req.query;
  const filter = {};
  if (agentType)        filter.agentType = agentType;
  if (category)         filter.category  = category;
  if (active !== undefined) filter.isActive = active !== 'false';

  const lessons = await Lesson.find(filter)
    .sort({ occurrenceCount: -1, createdAt: -1 })
    .lean();

  const stats = {
    total:      await Lesson.countDocuments(),
    active:     await Lesson.countDocuments({ isActive: true }),
    byCategory: await Lesson.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  };

  res.json({ lessons, stats });
});

exports.createLesson = asyncHandler(async (req, res) => {
  const { agentType, category, mistake, lesson } = req.body;
  if (!agentType || !category || !mistake || !lesson) {
    return res.status(400).json({ error: 'agentType, category, mistake, lesson are required' });
  }
  const doc = await Lesson.create({
    agentType, category, mistake, lesson,
    createdBy: req.user.id,
  });
  res.status(201).json(doc);
});

exports.updateLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowed = ['agentType', 'category', 'mistake', 'lesson', 'isActive', 'occurrenceCount'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const doc = await Lesson.findByIdAndUpdate(id, updates, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

exports.deleteLesson = asyncHandler(async (req, res) => {
  const doc = await Lesson.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ── Platform setup status ─────────────────────────────────────────────────────

exports.platformSetupStatus = asyncHandler(async (req, res) => {
  const env = require('../config/env');

  const services = {
    anthropic: {
      configured: Boolean(env.ANTHROPIC_API_KEY),
      hint: env.ANTHROPIC_API_KEY ? '***' : null,
    },
    encryption: {
      configured: Boolean(env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length >= 32),
    },
    github: {
      configured: Boolean(env.GITHUB_TOKEN),
    },
    render: {
      configured: Boolean(env.RENDER_API_KEY && env.RENDER_OWNER_ID),
    },
    atlas: {
      configured: Boolean(env.ATLAS_PUBLIC_KEY && env.ATLAS_PRIVATE_KEY && env.ATLAS_PROJECT_ID && env.ATLAS_CLUSTER_HOST),
    },
    cloudinary: {
      configured: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
    },
    resend: {
      configured: Boolean(env.RESEND_API_KEY),
    },
  };

  const allConfigured    = Object.values(services).every((s) => s.configured);
  const pipelineReady    = services.anthropic.configured;
  const deploymentReady  = services.github.configured && services.render.configured &&
                           services.atlas.configured;

  res.json({ services, allConfigured, pipelineReady, deploymentReady });
});

// ── Pipeline analytics ────────────────────────────────────────────────────────

exports.getAnalytics = asyncHandler(async (req, res) => {

  const [
    totalProjects,
    liveProjects,
    failedProjects,
    tokenAgg,
    statusCounts,
  ] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ status: 'live' }),
    Project.countDocuments({ status: 'failed' }),
    // Average tokens per phase across all completed phases
    Phase.aggregate([
      { $match: { status: 'completed', tokensUsed: { $gt: 0 } } },
      { $group: { _id: '$type', avgTokens: { $avg: '$tokensUsed' }, count: { $sum: 1 } } },
      { $sort: { avgTokens: -1 } },
    ]),
    // Project count by status
    Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const completionRate = totalProjects > 0
    ? Math.round((liveProjects / totalProjects) * 100)
    : 0;

  const statusMap = {};
  for (const s of statusCounts) statusMap[s._id] = s.count;

  res.json({
    totalProjects,
    liveProjects,
    failedProjects,
    completionRate,
    byStatus: statusMap,
    avgTokensByPhase: tokenAgg,
  });
});

// ── Platform stats ────────────────────────────────────────────────────────────

exports.platformStats = asyncHandler(async (req, res) => {
  const [
    totalUsers, totalProjects, liveProjects,
    totalFiles, totalLessons, recentActivity,
  ] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Project.countDocuments({ status: 'live' }),
    GeneratedFile.countDocuments({ status: 'validated' }),
    Lesson.countDocuments({ isActive: true }),
    AgentLog.find().sort({ timestamp: -1 }).limit(ACTIVITY_PAGE_SIZE).lean(),
  ]);

  res.json({
    users:          totalUsers,
    projects:       totalProjects,
    liveProjects,
    generatedFiles: totalFiles,
    activeLessons:  totalLessons,
    recentActivity,
  });
});

// ── Paginated activity log ────────────────────────────────────────────────────

exports.getActivity = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(ADMIN_ACTIVITY_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || ACTIVITY_PAGE_SIZE));
  const skip  = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AgentLog.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AgentLog.countDocuments(),
  ]);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1 });
});

// ── User management ───────────────────────────────────────────────────────────

exports.listUsers = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit  = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const search = (req.query.search || '').slice(0, 100);
  const skip   = (page - 1) * limit;

  const filter = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\]/g, '\$&'), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // Attach project count per user
  const userIds = users.map((u) => u._id);
  const projectCounts = await Project.aggregate([
    { $match: { ownerId: { $in: userIds } } },
    { $group: { _id: '$ownerId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(projectCounts.map((p) => [String(p._id), p.count]));

  const result = users.map((u) => ({
    _id:          u._id,
    name:         u.name,
    email:        u.email,
    role:         u.role,
    plan:         u.plan,
    isActive:     u.isActive,
    totpEnabled:  u.totpEnabled,
    lastLogin:    u.lastLogin,
    createdAt:    u.createdAt,
    projectCount: countMap[String(u._id)] || 0,
  }));

  res.json({ users: result, total, page, totalPages: Math.ceil(total / limit) || 1 });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const { isActive, role, plan } = req.body;
  const update = {};
  if (typeof isActive === 'boolean') update.isActive = isActive;
  if (role && ['admin', 'client'].includes(role)) update.role = role;
  if (plan && ['starter', 'pro'].includes(plan)) update.plan = plan;

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!user) throw require('../utils/ApiError').notFound('User not found');

  const { invalidateUserCache } = require('../middleware/auth');
  invalidateUserCache(String(user._id));

  res.json({ ok: true, user: { _id: user._id, name: user.name, email: user.email, role: user.role, plan: user.plan, isActive: user.isActive } });
});

// ── Agent log CSV export ─────────────────────────────────────────────────────

exports.exportAgentLogs = asyncHandler(async (req, res) => {
  const projectId = req.query.projectId;
  const filter    = projectId ? { projectId } : {};
  const logs      = await AgentLog.find(filter).sort({ timestamp: -1 }).limit(5000).lean();

  const rows = ['timestamp,agentName,event,message,projectId'];
  for (const l of logs) {
    const ts  = new Date(l.timestamp || l.createdAt).toISOString();
    const msg = (l.message || '').replace(/"/g, '""');
    rows.push(`"${ts}","${l.agentName || ''}","${l.event || ''}","${msg}","${l.projectId}"`);
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="agent-logs.csv"');
  res.send(rows.join('\n'));
});

// ── Admin impersonation ──────────────────────────────────────────────────────
// Issues a short-lived access token for the target user.
// The impersonating admin's ID is recorded in the token for audit.

exports.impersonateUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id).lean();
  if (!target) throw require('../utils/ApiError').notFound('User not found');
  if (!target.isActive) throw require('../utils/ApiError').badRequest('Cannot impersonate inactive user');

  const env = require('../config/env');
  const jwt = require('jsonwebtoken');
  const accessToken = jwt.sign(
    { sub: String(target._id), role: target.role, _impersonatedBy: req.user.id },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  require('../utils/logger').warn('admin: impersonation started', {
    adminId: req.user.id, targetId: target._id, targetEmail: target.email,
  });

  res.json({ accessToken, user: { _id: target._id, name: target.name, email: target.email, role: target.role } });
});
