const mongoose = require('mongoose');
const { Schema } = mongoose;

const SprintSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  name:      { type: String, required: true },
  index:     { type: Number, required: true },
  focus:     String,
  ceremonies: {
    planning: String,
    review:   String,
    retro:    String,
  },
  startDate: Date,
  endDate:   Date,
  status: {
    type:    String,
    enum:    ['planned', 'active', 'completed'],
    default: 'planned',
  },
  taskCount:          { type: Number, default: 0 },
  completedTaskCount: { type: Number, default: 0 },
}, { timestamps: true });

SprintSchema.index({ projectId: 1, index: 1 }, { unique: true });

module.exports = mongoose.model('Sprint', SprintSchema);
