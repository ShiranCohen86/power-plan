/**
 * Sprints 141-150: GDPR data export, audit CSV, privacy, system health
 */
const asyncHandler   = require('../utils/asyncHandler');
const ApiError       = require('../utils/ApiError');
const logger         = require('../utils/logger');

// Sprint 141: GDPR full data export as JSON
exports.exportMyData = asyncHandler(async (req, res) => {
  const User          = require('../models/User');
  const Project       = require('../models/Project');
  const Phase         = require('../models/Phase');
  const Document      = require('../models/Document');
  const Notification  = require('../models/Notification');
  const AuditLog      = require('../models/AuditLog');
  const GeneratedFile = require('../models/GeneratedFile');

  const userId = req.user.id;

  const [user, projects, notifications, auditLogs] = await Promise.all([
    User.findById(userId).select('-passwordHash -totpSecret -webAuthnChallenge -sessions -pipelineStarts').lean(),
    Project.find({ ownerId: userId, deletedAt: null }).lean(),
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(500).lean(),
    AuditLog.find({ userId }).sort({ createdAt: -1 }).limit(500).lean(),
  ]);

  const projectIds = projects.map((p) => p._id);
  const [phases, docs, files] = await Promise.all([
    Phase.find({ projectId: { $in: projectIds } }).lean(),
    Document.find({ projectId: { $in: projectIds } }).select('type summary version createdAt').lean(),
    GeneratedFile.find({ projectId: { $in: projectIds } }).select('filePath language status createdAt').lean(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user:       { ...user, settings: '[redacted — contains API keys]' },
    projects:   projects.map((p) => ({ ...p, settings: '[redacted]', requiredServices: '[redacted]' })),
    phases,
    documents:  docs,
    files,
    notifications,
    auditLogs,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="my-data-export.json"');
  res.json(payload);

  logger.info('compliance: data export', { userId });
});

// Sprint 142: Audit log export as CSV (admin)
exports.exportAuditLogCsv = asyncHandler(async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const { from, to } = req.query;

  const query = {};
  if (from) query.createdAt = { $gte: new Date(from) };
  if (to)   query.createdAt = { ...query.createdAt, $lte: new Date(to) };

  const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(10000).lean();

  const header = 'timestamp,userId,action,ip,userAgent,meta\n';
  const rows   = logs.map((l) => [
    l.createdAt?.toISOString() || '',
    l.userId || '',
    l.action || '',
    l.ip || '',
    `"${(l.userAgent || '').replace(/"/g, "''")}"`,
    `"${JSON.stringify(l.meta || {}).replace(/"/g, "''")}"`,
  ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
  res.send(header + rows);
});

// Sprint 148: Admin system health dashboard
exports.systemHealth = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const Phase    = require('../models/Phase');
  const Project  = require('../models/Project');

  const dbState   = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting

  const [runningPhases, stuckPhases, activeProjects, totalUsers, queueDepth] = await Promise.all([
    Phase.countDocuments({ status: 'running' }),
    Phase.countDocuments({ status: 'running', updatedAt: { $lt: new Date(Date.now() - 30 * 60_000) } }),
    Project.countDocuments({ status: { $in: ['planning', 'coding', 'deploying'] } }),
    require('../models/User').countDocuments({ isActive: true }),
    Phase.countDocuments({ status: 'pending' }),
  ]);

  const memUsage  = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());

  res.json({
    status:         stuckPhases === 0 && dbState === 1 ? 'healthy' : 'degraded',
    db:             { connected: dbState === 1, state: dbState },
    pipeline:       { running: runningPhases, stuck: stuckPhases, active: activeProjects, queued: queueDepth },
    platform:       { users: totalUsers },
    process:        { uptimeSec, memRssMB: Math.round(memUsage.rss / 1_048_576), memHeapMB: Math.round(memUsage.heapUsed / 1_048_576) },
    ts:             new Date().toISOString(),
  });
});

// Sprint 145: Privacy dashboard — what data we store about the user
exports.getPrivacySummary = asyncHandler(async (req, res) => {
  const User          = require('../models/User');
  const Project       = require('../models/Project');
  const AuditLog      = require('../models/AuditLog');
  const Notification  = require('../models/Notification');
  const GeneratedFile = require('../models/GeneratedFile');

  const userId = req.user.id;
  const user   = await User.findById(userId).lean();

  const projects = await Project.find({ ownerId: userId, deletedAt: null }).select('_id').lean();
  const projectIds = projects.map((p) => p._id);

  const [notifCount, auditCount, fileCount] = await Promise.all([
    Notification.countDocuments({ userId }),
    AuditLog.countDocuments({ userId }),
    GeneratedFile.countDocuments({ projectId: { $in: projectIds } }),
  ]);

  res.json({
    account: {
      name:          user.name,
      email:         user.email,
      createdAt:     user.createdAt,
      authMethods:   user.authMethods,
      sessionsCount: user.sessions?.length || 0,
    },
    data: {
      projects:          projects.length,
      notifications:     notifCount,
      auditLogEntries:   auditCount,
      generatedFiles:    fileCount,
    },
    controls: {
      canExportData:   true,
      canDeleteAccount: true,
      dataRetentionDays: 30, // soft-deleted projects retained 30 days
    },
  });
});
