const Notification = require('../models/Notification');
const logger       = require('../utils/logger');

const NOTIFICATION_DEFAULT_LIMIT = 30;

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

async function getForUser(userId, { limit = NOTIFICATION_DEFAULT_LIMIT, unreadOnly = false, page = 1 } = {}) {
  const filter = { userId };
  if (unreadOnly) filter.read = false;
  const skip = (page - 1) * limit;
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return { notifications, total, page, hasMore: skip + notifications.length < total };
}

async function unreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

module.exports = { create, markRead, markAllRead, getForUser, unreadCount };
