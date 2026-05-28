const path = require('path');
const fs = require('fs');
const winston = require('winston');
const env = require('../config/env');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
];

// File transports in production (or when LOG_TO_FILE=true)
if (env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  transports.push(
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', maxsize: 10_000_000, maxFiles: 3 }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log'), maxsize: 20_000_000, maxFiles: 5 }),
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'power-plan' },
  transports,
});

module.exports = logger;
