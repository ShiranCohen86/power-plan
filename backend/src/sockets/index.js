const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const env        = require('../config/env');
const logger     = require('../utils/logger');
const Project    = require('../models/Project');

let io;

// S129: in-memory presence map  { projectId → Set<{ userId, name }> }
const presenceMap = new Map();

async function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: env.NODE_ENV === 'production'
        ? [env.FRONTEND_URL]
        : [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'],
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

  // Require valid JWT on every connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('auth:required'));
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.userId = decoded.sub;
      next();
    } catch {
      next(new Error('auth:invalid'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('socket connected', { id: socket.id, userId: socket.userId });

    socket.on('join:project', async (projectId) => {
      if (!projectId || !socket.userId) return;
      try {
        // Allow owner OR accepted collaborator
        const ProjectCollaborator = require('../models/ProjectCollaborator');
        const [project, collab] = await Promise.all([
          Project.findOne({ _id: projectId, ownerId: socket.userId }).lean(),
          ProjectCollaborator.findOne({ projectId, userId: socket.userId, status: 'accepted' }).lean(),
        ]);
        if (!project && !collab) return;
        socket.join(`project:${projectId}`);
        socket.currentProjectId = projectId;

        // S129: presence
        if (!presenceMap.has(projectId)) presenceMap.set(projectId, new Map());
        const User = require('../models/User');
        const user = await User.findById(socket.userId).select('name').lean();
        presenceMap.get(projectId).set(socket.id, { userId: socket.userId, name: user?.name || 'Unknown' });
        const viewers = [...presenceMap.get(projectId).values()];
        io.to(`project:${projectId}`).emit('presence:update', { viewers });

        logger.debug('socket joined project room', { socketId: socket.id, projectId });
      } catch { /* ignore malformed projectId */ }
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
      // S129: remove from presence
      if (presenceMap.has(projectId)) {
        presenceMap.get(projectId).delete(socket.id);
        const viewers = [...presenceMap.get(projectId).values()];
        io.to(`project:${projectId}`).emit('presence:update', { viewers });
        if (presenceMap.get(projectId).size === 0) presenceMap.delete(projectId);
      }
    });

    socket.on('disconnect', () => {
      logger.debug('socket disconnected', { id: socket.id });
      // S129: clean up presence on disconnect
      const projectId = socket.currentProjectId;
      if (projectId && presenceMap.has(projectId)) {
        presenceMap.get(projectId).delete(socket.id);
        const viewers = [...presenceMap.get(projectId).values()];
        io.to(`project:${projectId}`).emit('presence:update', { viewers });
        if (presenceMap.get(projectId).size === 0) presenceMap.delete(projectId);
      }
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
