const mongoose = require('mongoose');
const { Schema } = mongoose;

const AgentLogSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  phaseId:   { type: Schema.Types.ObjectId, ref: 'Phase' },
  agentName: { type: String, required: true },
  event: {
    type:     String,
    enum:     ['started', 'narrative', 'file_written', 'completed', 'error'],
    required: true,
  },
  message:  String,
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

AgentLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
AgentLogSchema.index({ projectId: 1, timestamp: -1 });

module.exports = mongoose.model('AgentLog', AgentLogSchema);
