const mongoose = require('mongoose');

const GeneratedFileSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    phaseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Phase',   required: true },
    filePath:  { type: String, required: true },
    content:   { type: String, required: true },
    r2Key:     { type: String, default: '' },  // R2 object key for external download (optional)
    language:  { type: String, default: 'text' },
    status:    { type: String, enum: ['generated', 'validated', 'failed'], default: 'generated' },
  },
  { timestamps: true },
);

GeneratedFileSchema.index({ projectId: 1, filePath: 1 }, { unique: true });

module.exports = mongoose.model('GeneratedFile', GeneratedFileSchema);
