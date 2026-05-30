const Project  = require('../models/Project');
const User     = require('../models/User');
const email    = require('./email.service');
const notifSvc = require('./notification.service');
const logger   = require('../utils/logger');

/**
 * Sends email + in-app notification when all planning phases complete.
 * Fire-and-forget — errors are suppressed so the pipeline is not blocked.
 */
async function notifyPlanningComplete(projectId) {
  const proj  = await Project.findById(projectId).lean();
  const owner = await User.findById(proj?.ownerId).lean();
  if (!owner) return;

  if (owner.email) {
    email.sendPlanningComplete({
      to:           owner.email,
      userName:     owner.name,
      projectTitle: proj.title,
    }).catch((err) => logger.warn('phase-notifier: sendPlanningComplete email failed', { projectId, error: err.message }));
  }

  notifSvc.create({
    userId:    proj.ownerId,
    projectId,
    type:      'planning_complete',
    title:     `📋 ${proj.title} — האפיון הושלם`,
    message:   'כל 12 שלבי התכנון הושלמו. Claude מתחיל לכתוב קוד.',
  }).catch((err) => logger.warn('phase-notifier: planning_complete notification failed', { projectId, error: err.message }));
}

/**
 * Sends email + in-app notification when an API quota is exhausted mid-pipeline.
 * Fire-and-forget — errors are suppressed so the pipeline is not blocked.
 */
async function notifyQuotaExhausted(projectId) {
  const proj  = await Project.findById(projectId).lean();
  const owner = await User.findById(proj?.ownerId).lean();
  if (!owner) return;

  if (owner.email) {
    email.sendQuotaExhausted({
      to:           owner.email,
      userName:     owner.name,
      projectTitle: proj.title,
      plan:         owner.plan || 'starter',
    }).catch((err) => logger.warn('phase-notifier: sendQuotaExhausted email failed', { projectId, error: err.message }));
  }

  notifSvc.create({
    userId:    proj.ownerId,
    projectId,
    type:      'quota_exhausted',
    title:     `⚠️ ${proj.title} — הפייפליין הופסק`,
    message:   'נגמר קרדיט ה-API. הטען קרדיט כדי להמשיך.',
  }).catch((err) => logger.warn('phase-notifier: quota_exhausted notification failed', { projectId, error: err.message }));
}

module.exports = { notifyPlanningComplete, notifyQuotaExhausted };
