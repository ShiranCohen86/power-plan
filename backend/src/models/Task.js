const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskSchema = new Schema({
  projectId:    { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  phaseId:      { type: Schema.Types.ObjectId, ref: 'Phase' },
  sprintIndex:  { type: Number, default: null },
  epicTitle:    { type: String, required: true },
  featureTitle: { type: String, required: true },
  title:        { type: String, required: true },
  description:  String,
  type: {
    type:    String,
    enum:    ['frontend', 'backend', 'ai', 'devops', 'qa', 'infrastructure'],
    default: 'backend',
  },
  status: {
    type:    String,
    enum:    ['backlog', 'planning', 'in-progress', 'review', 'testing', 'deployed', 'blocked'],
    default: 'backlog',
  },
  priority: {
    type:    String,
    enum:    ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  complexity: {
    type:    String,
    enum:    ['xs', 's', 'm', 'l', 'xl'],
    default: 'm',
  },
  estimatedHours: { type: Number, default: null },
  riskLevel: {
    type:    String,
    enum:    ['low', 'medium', 'high'],
    default: 'low',
  },
}, { timestamps: true });

TaskSchema.index({ projectId: 1, epicTitle: 1, featureTitle: 1 });
TaskSchema.index({ projectId: 1, sprintIndex: 1 });
TaskSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.model('Task', TaskSchema);
