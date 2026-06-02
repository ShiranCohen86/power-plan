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

const WebAuthnCredentialSchema = new mongoose.Schema(
  {
    credentialID: { type: String, required: true },  // base64url
    publicKey:    { type: String, required: true },  // base64url encoded COSE key
    counter:      { type: Number, default: 0 },
    deviceType:   { type: String },                  // 'singleDevice' | 'multiDevice'
    backedUp:     { type: Boolean, default: false },
    transports:   { type: [String], default: [] },
    createdAt:    { type: Date, default: Date.now },
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

    // OAuth
    googleId:     { type: String, sparse: true, index: true },
    avatar:       { type: String },
    authMethods:  { type: [String], default: ['password'] }, // ['password','google','webauthn']

    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin:            Date,
    sessions:             { type: [SessionSchema], default: [] },
    settings: {
      anthropicApiKey: { type: String, select: false },
      githubToken:     { type: String, select: false },
      renderApiKey:    { type: String, select: false },
    },

    // WebAuthn / Passkeys
    webAuthnCredentials: { type: [WebAuthnCredentialSchema], default: [] },
    webAuthnChallenge:   { type: String, select: false },

    // TOTP 2FA
    totpSecret:  { type: String, select: false },
    totpEnabled: { type: Boolean, default: false },

    // Email notification preferences
    notifPrefs: {
      deploymentSuccess: { type: Boolean, default: true },
      quotaExhausted:    { type: Boolean, default: true },
      phaseFailed:       { type: Boolean, default: true },
      planningComplete:  { type: Boolean, default: true },
    },

    pipelineStarts: { type: [Date], select: false, default: [] },
    loginAttempts:  { type: Number, default: 0 },
    lockUntil:      { type: Date },
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
  delete obj.totpSecret;
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
