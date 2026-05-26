const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');

let io;

async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    },
  });

  // Attach Redis pub/sub adapter when REDIS_URL is configured (multi-instance support)
  if (env.REDIS_URL) {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const Redis = require('ioredis');
      const pub = new Redis(env.REDIS_URL, { lazyConnect: false, enableReadyCheck: true });
      const sub = pub.duplicate();
      io.adapter(createAdapter(pub, sub));
      logger.info('Socket.io: Redis adapter attached', { url: env.REDIS_URL.replace(/\/\/.*@/, '//***@') });
    } catch (err) {
      logger.error('Socket.io: Redis adapter failed — falling back to in-memory', { error: err.message });
    }
  } else if (env.NODE_ENV === 'production') {
    logger.warn('Socket.io: No REDIS_URL set — running single-instance (WS events will not cross instances)');
  }

  io.on('connection', (socket) => {
    logger.debug('socket connected', { id: socket.id });

    socket.on('join:project', (projectId) => {
      if (!projectId) return;
      socket.join(`project:${projectId}`);
      logger.debug('socket joined project room', { socketId: socket.id, projectId });
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('socket disconnected', { id: socket.id });
    });
  });

  logger.info('Socket.io initialized');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToProject(projectId, event, data) {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
}

module.exports = { initSocket, getIO, emitToProject };
