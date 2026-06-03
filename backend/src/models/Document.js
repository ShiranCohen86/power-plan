const mongoose = require('mongoose');
const { Schema } = mongoose;

const DocumentSchema = new Schema({
  projectId:       { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  phaseId:         { type: Schema.Types.ObjectId, ref: 'Phase',   required: true, index: true },
  type:            { type: String, required: true },
  content:         { type: String, required: true },
  previousContent: { type: String, default: '' }, // S103: content before last refinement
  summary:         { type: String, default: '' },
  version:         { type: Number, default: 1 },
  isApproved:      { type: Boolean, default: false },
}, { timestamps: true });

DocumentSchema.index({ projectId: 1, type: 1 });

module.exports = mongoose.model('Document', DocumentSchema);
