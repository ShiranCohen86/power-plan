const Lesson      = require('../models/Lesson');
const asyncHandler = require('../utils/asyncHandler');

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
      hint: env.ANTHROPIC_API_KEY ? `sk-ant-...${env.ANTHROPIC_API_KEY.slice(-4)}` : null,
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

// ── Platform stats ────────────────────────────────────────────────────────────

exports.platformStats = asyncHandler(async (req, res) => {
  const Project      = require('../models/Project');
  const User         = require('../models/User');
  const GeneratedFile = require('../models/GeneratedFile');
  const AgentLog     = require('../models/AgentLog');

  const [
    totalUsers, totalProjects, liveProjects,
    totalFiles, totalLessons, recentActivity,
  ] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments(),
    Project.countDocuments({ status: 'live' }),
    GeneratedFile.countDocuments({ status: 'validated' }),
    Lesson.countDocuments({ isActive: true }),
    AgentLog.find().sort({ timestamp: -1 }).limit(20).lean(),
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
