const mongoose = require('mongoose');
const { Schema } = mongoose;

const PublicApiKeySchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, maxlength: 64 },
  keyHash:     { type: String, required: true, select: false },
  prefix:      { type: String, required: true }, // first 8 chars for display
  lastUsedAt:  Date,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PublicApiKey', PublicApiKeySchema);
