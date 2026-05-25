const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action:    { type: String, required: true, index: true },
    entity:    String,
    entityId:  mongoose.Schema.Types.ObjectId,
    ip:        String,
    userAgent: String,
    meta:      mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
