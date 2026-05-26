const mongoose = require('mongoose');
const { Schema } = mongoose;

const MeetingSchema = new Schema({
  projectId:         { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  phaseId:           { type: Schema.Types.ObjectId, ref: 'Phase',   required: true },
  type:              { type: String, required: true },
  participants:      [String],
  status:            { type: String, enum: ['scheduled', 'running', 'completed'], default: 'running' },
  improvementsCount: { type: Number, default: 0 },
  scheduledAt:       Date,
  startedAt:         { type: Date, default: Date.now },
  completedAt:       Date,
}, { timestamps: true });

MeetingSchema.index({ projectId: 1, phaseId: 1 });

module.exports = mongoose.model('Meeting', MeetingSchema);
