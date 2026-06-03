const mongoose = require('mongoose');
const { Schema } = mongoose;

const PhaseCommentSchema = new Schema({
  projectId:  { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  phaseIndex: { type: Number, required: true },
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName:   { type: String, required: true },
  text:       { type: String, required: true, maxlength: 2000 },
  isEdited:   { type: Boolean, default: false },
}, { timestamps: true });

PhaseCommentSchema.index({ projectId: 1, phaseIndex: 1 });

module.exports = mongoose.model('PhaseComment', PhaseCommentSchema);
