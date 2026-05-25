const mongoose = require('mongoose');
const { Schema } = mongoose;

const DocumentSchema = new Schema({
  projectId:  { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  phaseId:    { type: Schema.Types.ObjectId, ref: 'Phase',   required: true, index: true },
  type:       { type: String, required: true },
  content:    { type: String, required: true },
  summary:    { type: String, default: '' },
  version:    { type: Number, default: 1 },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
