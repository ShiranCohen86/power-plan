const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  agentType: {
    type: String,
    required: true,
    enum: [
      'idea_understanding', 'product_discovery', 'market_analysis', 'ux_architecture',
      'tech_architecture', 'system_design', 'database_design', 'ai_agent_system',
      'orchestration', 'dev_planning', 'qa_strategy', 'devops_strategy',
      'db_schema', 'backend_scaffold', 'frontend_scaffold', 'tests', 'config', 'review',
    ],
    index: true,
  },
  category: {
    type: String,
    enum: ['spec_quality', 'code_quality', 'architecture', 'security', 'ux', 'planning'],
    required: true,
    index: true,
  },
  mistake:  { type: String, required: true, maxlength: 500 },
  lesson:   { type: String, required: true, maxlength: 500 },
  isActive: { type: Boolean, default: true, index: true },
  occurrenceCount: { type: Number, default: 1, min: 1 },
  projectCount:    { type: Number, default: 1, min: 1 },
  lastSeenAt:      { type: Date, default: Date.now },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

lessonSchema.index({ agentType: 1, isActive: 1, occurrenceCount: -1 });

module.exports = mongoose.model('Lesson', lessonSchema);
