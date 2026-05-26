const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const ROLES = ['admin', 'client'];
const PLANS = ['starter', 'pro'];

const SessionSchema = new mongoose.Schema(
  {
    jtiHash:   { type: String, required: true },
    userAgent: String,
    ip:        String,
    lastSeen:  { type: Date, default: Date.now },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    name:                 { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash:         { type: String, select: false },
    role:                 { type: String, enum: ROLES, default: 'client', index: true },
    plan:                 { type: String, enum: PLANS, default: 'starter', index: true },
    isActive:             { type: Boolean, default: true },
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin:            Date,
    sessions:             { type: [SessionSchema], default: [] },
    settings: {
      anthropicApiKey: { type: String, select: false }, // encrypted AES-256
      githubToken:     { type: String, select: false }, // encrypted AES-256
      renderApiKey:    { type: String, select: false }, // encrypted AES-256
    },
  },
  { timestamps: true },
);

UserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
};

UserSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.sessions;
  delete obj.__v;
  return obj;
};

UserSchema.statics.ROLES = ROLES;
UserSchema.statics.PLANS = PLANS;

const MAX_SESSIONS = 5;
UserSchema.pre('save', function (next) {
  if (this.sessions.length > MAX_SESSIONS) {
    this.sessions = this.sessions.slice(-MAX_SESSIONS);
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
