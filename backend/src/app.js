const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const env = require('./config/env');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error');
const requestLogger = require('./middleware/logger');
const logger = require('./utils/logger');
const { RATE_AUTH_WINDOW_MS, RATE_AUTH_MAX } = require('./config/constants');

// Build a shared Redis store for rate limiters when REDIS_URL is configured.
// Falls back to in-memory (default) when Redis is unavailable.
function _buildRateLimitStore(prefix) {
  if (!env.REDIS_URL) return undefined;
  try {
    const { RedisStore } = require('rate-limit-redis');
    const Redis = require('ioredis');
    const client = new Redis(env.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    client.on('error', (err) => logger.warn('rate-limit redis error', { error: err.message }));
    return new RedisStore({ prefix, sendCommand: (...args) => client.call(...args) });
  } catch (err) {
    logger.warn('rate-limit-redis store init failed, falling back to in-memory', { error: err.message });
    return undefined;
  }
}

// Sentry — init before any other middleware; no-op when DSN not configured
let Sentry = null;
if (env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
}

const app = express();

if (Sentry) app.use(Sentry.Handlers.requestHandler());

if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  logger.warn('JWT_SECRET and JWT_REFRESH_SECRET are identical — use two different values.');
}

app.set('trust proxy', 1);

// In production Vite outputs content-hashed bundles with no inline scripts,
// so we can remove 'unsafe-inline' from scriptSrc. Dev mode needs it for HMR.
const scriptSrc = env.NODE_ENV === 'production'
  ? ["'self'"]
  : ["'self'", "'unsafe-inline'"];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = env.NODE_ENV === 'production'
  ? [env.FRONTEND_URL].filter(Boolean)
  : [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Attach a unique request ID for tracing
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || require('crypto').randomBytes(8).toString('hex');
  next();
});
app.use(require('./middleware/sanitize'));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(requestLogger);

const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: _buildRateLimitStore('rl:global:'),
});
app.use('/api', globalLimiter);
app.use('/api/v1', globalLimiter);

const authLimiter = rateLimit({
  windowMs: RATE_AUTH_WINDOW_MS,
  limit: RATE_AUTH_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  store: _buildRateLimitStore('rl:auth:'),
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/health/db', async (_req, res) => {
  const mongoose = require('mongoose');
  const state = mongoose.connection.readyState;
  res.json({ ok: state === 1, state });
});
app.get('/health/claude', (_req, res) => {
  const hasKey = !!env.ANTHROPIC_API_KEY;
  res.json({ ok: hasKey, model: env.ANTHROPIC_MODEL });
});

// v1 prefix — canonical going forward
app.use('/api/v1', routes);
// Backward-compat: keep unversioned /api working for 3 months (deprecation: 2026-09-01)
app.use('/api', routes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found', path: _req.originalUrl }));

if (env.NODE_ENV === 'production') {
  const path = require('path');
  const distPath = path.join(__dirname, '../../frontend/dist');

  // JS/CSS assets have content-hashed names — cache them aggressively
  app.use(express.static(distPath, {
    maxAge: '1y',
    setHeaders(res, filePath) {
      // index.html and manifests must never be cached so browsers always
      // get the latest asset references after a deploy
      if (filePath.endsWith('.html') || filePath.endsWith('.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (Sentry) app.use(Sentry.Handlers.errorHandler());
app.use(errorMiddleware);

module.exports = app;
