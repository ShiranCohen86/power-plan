const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  type: {
    type: String,
    enum: ['deployment_success', 'quota_exhausted', 'phase_failed', 'pipeline_complete', 'info'],
    required: true,
  },
  title:   { type: String, required: true, maxlength: 120 },
  message: { type: String, maxlength: 500 },
  url:     { type: String },
  read:    { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

// TTL — auto-delete after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
// Compound for unread count queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
