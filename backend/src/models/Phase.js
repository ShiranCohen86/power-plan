const mongoose = require('mongoose');
const { Schema } = mongoose;

const PhaseSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  type:      { type: String, required: true },
  index:     { type: Number, required: true },
  status: {
    type:    String,
    enum:    ['pending', 'running', 'completed', 'failed', 'awaiting_approval', 'interrupted'],
    default: 'pending',
    index:   true,
  },
  agentName:       String,
  narrativeStream: [String],
  startedAt:       Date,
  completedAt:     Date,
  tokensUsed:      { type: Number, default: 0 },
  errorMessage:    String,
  retryCount:      { type: Number, default: 0 },
  refineCount:     { type: Number, default: 0 },
  // Sprint 101: phase output rating (1=thumbs down, 2=thumbs up)
  rating:          { type: Number, enum: [1, 2], default: null },
}, { timestamps: true });

PhaseSchema.index({ projectId: 1, index: 1 }, { unique: true });

module.exports = mongoose.model('Phase', PhaseSchema);
