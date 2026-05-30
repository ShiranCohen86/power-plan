const {
  TOKEN_EXPIRY_ACCESS, TOKEN_EXPIRY_REFRESH,
  RATE_AUTH_WINDOW_MS, MAX_CONCURRENT_PIPELINES,
  BCRYPT_ROUNDS,
} = require('./constants');

const env = {
  NODE_ENV:               process.env.NODE_ENV || 'development',
  PORT:                   parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI:              process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/power_plan',
  JWT_SECRET:             process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  JWT_EXPIRES_IN:         process.env.JWT_EXPIRES_IN || TOKEN_EXPIRY_ACCESS,
  JWT_REFRESH_SECRET:     process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_DIFFERENT',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || TOKEN_EXPIRY_REFRESH,
  BCRYPT_SALT_ROUNDS:     parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || BCRYPT_ROUNDS,
  FRONTEND_URL:           process.env.FRONTEND_URL || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS:   parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || RATE_AUTH_WINDOW_MS,
  RATE_LIMIT_MAX:         parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  LOG_LEVEL:              process.env.LOG_LEVEL || 'info',
  ANTHROPIC_API_KEY:      process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL:        process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  ANTHROPIC_MODEL_STARTER: process.env.ANTHROPIC_MODEL_STARTER || 'claude-haiku-4-5-20251001',
  PIPELINE_MAX_CONCURRENT: parseInt(process.env.PIPELINE_MAX_CONCURRENT, 10) || MAX_CONCURRENT_PIPELINES,
  ENCRYPTION_KEY:         process.env.ENCRYPTION_KEY || '',
  MEETING_PRE_DELAY_MS:   parseInt(process.env.MEETING_PRE_DELAY_MS, 10) || 20000,

  // Google OAuth
  GOOGLE_CLIENT_ID:   process.env.GOOGLE_CLIENT_ID || '',

  // WebAuthn / Passkeys
  WEBAUTHN_RP_NAME:   process.env.WEBAUTHN_RP_NAME || 'Power Plan',
  WEBAUTHN_RP_ID:     process.env.WEBAUTHN_RP_ID   || 'localhost',

  // MongoDB Atlas (Power Plan's shared cluster)
  ATLAS_PUBLIC_KEY:   process.env.ATLAS_PUBLIC_KEY  || '',
  ATLAS_PRIVATE_KEY:  process.env.ATLAS_PRIVATE_KEY || '',
  ATLAS_PROJECT_ID:   process.env.ATLAS_PROJECT_ID  || '',
  ATLAS_CLUSTER_NAME: process.env.ATLAS_CLUSTER_NAME || 'powerplan-cluster',
  ATLAS_CLUSTER_HOST: process.env.ATLAS_CLUSTER_HOST || '',  // e.g. cluster0.abc12.mongodb.net

  // GitHub (Power Plan's org)
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_ORG:   process.env.GITHUB_ORG   || 'power-plan-apps',

  // Render (Power Plan's account)
  RENDER_API_KEY:  process.env.RENDER_API_KEY  || '',
  RENDER_OWNER_ID: process.env.RENDER_OWNER_ID || '',

  // Resend (Power Plan's shared email account)
  RESEND_API_KEY:  process.env.RESEND_API_KEY  || '',
  RESEND_FROM:     process.env.RESEND_FROM     || 'hello@powerplan.app',

  // Cloudinary (Power Plan's shared media account)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY:    process.env.CLOUDINARY_API_KEY    || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  RETURN_DEV_TOKEN: process.env.RETURN_DEV_TOKEN === 'true',

  // Sentry (optional) — error monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || '',

  // Encryption key rotation (optional v2 key)
  ENCRYPTION_KEY_V2: process.env.ENCRYPTION_KEY_V2 || '',

  // Redis (optional) — Socket.io pub/sub adapter for multi-instance deployments
  REDIS_URL: process.env.REDIS_URL || '',

  // Cloudflare R2 (optional) — object storage for generated code files
  CF_R2_ACCOUNT_ID:        process.env.CF_R2_ACCOUNT_ID        || '',
  CF_R2_ACCESS_KEY_ID:     process.env.CF_R2_ACCESS_KEY_ID     || '',
  CF_R2_SECRET_ACCESS_KEY: process.env.CF_R2_SECRET_ACCESS_KEY || '',
  CF_R2_BUCKET_NAME:       process.env.CF_R2_BUCKET_NAME       || 'power-plan-files',
};

if (env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_jwt_secret_change_me') {
    throw new Error('FATAL: JWT_SECRET must be set to a strong random value in production');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'dev_refresh_secret_change_me_DIFFERENT') {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be set to a strong random value in production');
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('FATAL: ANTHROPIC_API_KEY must be set in production');
  }
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('FATAL: ENCRYPTION_KEY must be set in production — all stored API keys will be unencrypted otherwise');
  }
  if (env.RETURN_DEV_TOKEN) {
    throw new Error('FATAL: RETURN_DEV_TOKEN must not be enabled in production — it leaks password reset tokens');
  }
}

// NOTE: identical-JWT-secret check is done in app.js (after logger is available)

module.exports = env;
