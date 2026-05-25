const Notification = require('../models/Notification');
const logger       = require('../utils/logger');

async function create({ userId, projectId, type, title, message, url }) {
  try {
    return await Notification.create({ userId, projectId, type, title, message, url });
  } catch (err) {
    logger.warn('notification.service: failed to create notification', { error: err.message });
    return null;
  }
}

async function markRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true },
  );
}

async function markAllRead(userId) {
  return Notification.updateMany({ userId, read: false }, { read: true });
}

async function getForUser(userId, { limit = 30, unreadOnly = false } = {}) {
  const filter = { userId };
  if (unreadOnly) filter.read = false;
  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function unreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

module.exports = { create, markRead, markAllRead, getForUser, unreadCount };
