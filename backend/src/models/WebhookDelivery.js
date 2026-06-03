const mongoose = require('mongoose');
const { Schema } = mongoose;

const WebhookDeliverySchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId:    { type: Schema.Types.ObjectId, ref: 'Project' },
  event:        { type: String, required: true },
  url:          { type: String, required: true },
  statusCode:   { type: Number },
  success:      { type: Boolean, default: false },
  errorMessage: { type: String },
  attempt:      { type: Number, default: 1 },
  duration:     { type: Number }, // ms
}, { timestamps: true });

WebhookDeliverySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', WebhookDeliverySchema);
