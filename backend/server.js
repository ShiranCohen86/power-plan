require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

const server = http.createServer(app);

// On startup, any phase stuck in 'running' from a previous process crash gets reset
// so the pipeline owner can safely resume without manual intervention.
async function recoverOrphanedPhases() {
  const Phase = require('./src/models/Phase');
  const Project = require('./src/models/Project');
  const result = await Phase.updateMany(
    { status: 'running' },
    { $set: { status: 'interrupted', errorMessage: 'Server restarted — safe to resume' } },
  );
  if (result.modifiedCount > 0) {
    logger.warn(`startup: reset ${result.modifiedCount} orphaned running phase(s) to 'interrupted'`);
    // Also reset project status so owners aren't stuck
    await Project.updateMany(
      { status: 'planning' },
      { $set: { status: 'paused' } },
    );
  }
}

async function start() {
  await connectDB();
  await recoverOrphanedPhases();

  const { initSocket } = require('./src/sockets');
  await initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Power Plan backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err: err.message });
  process.exit(1);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    const mongoose = require('mongoose');
    mongoose.disconnect().then(() => {
      logger.info('MongoDB disconnected');
      process.exit(0);
    }).catch(() => process.exit(0));
  });
  // Force exit if graceful shutdown takes too long (Render's timeout is 10s)
  setTimeout(() => { logger.warn('Forced exit after timeout'); process.exit(1); }, 9000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled errors ───────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — exiting', { error: err.message, stack: err.stack });
  process.exit(1);
});
