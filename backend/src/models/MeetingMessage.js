const mongoose = require('mongoose');
const { Schema } = mongoose;

const MeetingMessageSchema = new Schema({
  meetingId:   { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
  projectId:   { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  role:        { type: String, required: true },
  displayName: { type: String, required: true },
  color:       String,
  message:     { type: String, required: true },
  type: {
    type:    String,
    enum:    ['observation', 'correction', 'approval', 'concern', 'decision'],
    default: 'observation',
  },
  timestamp: { type: Date, default: Date.now },
});

MeetingMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
MeetingMessageSchema.index({ meetingId: 1, timestamp: 1 });
MeetingMessageSchema.index({ projectId: 1 });

module.exports = mongoose.model('MeetingMessage', MeetingMessageSchema);
