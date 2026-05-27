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
