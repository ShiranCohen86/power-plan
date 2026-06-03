const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProjectCollaboratorSchema = new Schema({
  projectId:  { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  userId:     { type: Schema.Types.ObjectId, ref: 'User' },       // null = pending invite
  email:      { type: String, required: true, lowercase: true },
  role:       { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
  status:     { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
  invitedBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  inviteToken: { type: String, sparse: true, index: true },
  acceptedAt:  Date,
}, { timestamps: true });

ProjectCollaboratorSchema.index({ projectId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('ProjectCollaborator', ProjectCollaboratorSchema);
