require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

const server = http.createServer(app);

async function start() {
  await connectDB();

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
