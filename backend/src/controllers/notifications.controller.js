const notifSvc      = require('../services/notification.service');
const asyncHandler  = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { unread } = req.query;
  const notifications = await notifSvc.getForUser(req.user.id, {
    unreadOnly: unread === 'true',
  });
  const count = await notifSvc.unreadCount(req.user.id);
  res.json({ notifications, unreadCount: count });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notif = await notifSvc.markRead(req.params.id, req.user.id);
  if (!notif) return res.status(404).json({ error: 'Not found' });
  res.json(notif);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await notifSvc.markAllRead(req.user.id);
  res.json({ ok: true });
});

exports.dismiss = asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const result = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
