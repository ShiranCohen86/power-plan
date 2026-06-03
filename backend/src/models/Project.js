const mongoose = require('mongoose');

const DiscoveryAnswerSchema = new mongoose.Schema(
  { question: { type: String, required: true }, answer: { type: String, required: true } },
  { _id: false },
);

const ProjectSchema = new mongoose.Schema(
  {
    title:             { type: String, required: true, trim: true },
    idea:              { type: String, required: true, trim: true },
    ownerId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['onboarding', 'planning', 'coding', 'deploying', 'live', 'failed', 'paused', 'quota_paused', 'awaiting_credentials', 'archived'],
      default: 'onboarding',
      index: true,
    },
    currentPhaseIndex: { type: Number, default: 0 },
    completionPercent: { type: Number, default: 0 },
    discoveryAnswers:  { type: [DiscoveryAnswerSchema], default: [] },
    approvalGates:     { type: Boolean, default: true },
    stack:             { type: String, default: 'node-react' },

    // Auto-provisioned infrastructure (managed by Power Plan)
    infra: {
      mongoDbName:     String,
      mongoUser:       String,
      mongoUri:        String,   // encrypted — full connection string
      githubRepoName:  String,
      githubRepoUrl:   String,
      renderServiceId:   String,
      renderUrl:         String,
      cloudinaryPreset:  String,
    },

    // Per-project API keys — each project pays from its own account
    settings: {
      anthropicApiKey: { type: String, select: false }, // encrypted AES-256
      githubToken:     { type: String, select: false }, // encrypted AES-256
      renderApiKey:    { type: String, select: false }, // encrypted AES-256
    },

    // Third-party services detected from AI planning docs — user must provide credentials
    requiredServices: [{
      serviceId:           { type: String, required: true },
      credentialsProvided: { type: Boolean, default: false },
      skipped:             { type: Boolean, default: false },
      credentials:         { type: Map, of: String, select: false }, // encrypted AES-256
    }],

    // Sprint 92: tags
    tags: { type: [String], default: [] },
    // Sprint 93: pinning
    isPinned: { type: Boolean, default: false, index: true },
    // Sprint 97: notes
    notes: { type: String, default: '' },
    // Sprint 109: custom pause points (phase indices that require manual approval)
    pauseBeforePhases: { type: [Number], default: [] },
    // Sprint 117: token budget per project (0 = unlimited)
    tokenBudget: { type: Number, default: 0 },
    // Sprint 117: total tokens used across all phases
    totalTokensUsed: { type: Number, default: 0 },
    // Sprint 121: read-only share
    shareToken:   { type: String, sparse: true, index: true },
    shareEnabled: { type: Boolean, default: false },
    // Sprint 136: custom env vars for generated app
    customEnvVars: { type: Map, of: String, default: {} },

    // Quota / pause tracking
    quotaPausedAt:   Date,
    quotaResumedAt:  Date,

    deployedUrl:     String,  // final live URL (copy of infra.renderUrl)
    deletedAt:       { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

ProjectSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('Project', ProjectSchema);
