const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../utils/logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    },
  });

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
