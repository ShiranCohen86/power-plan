const env = require('../config/env');
const logger = require('../utils/logger');

// Global rate limiter — max N concurrent Claude API calls across all pipelines.
// Prevents overwhelming the Anthropic API and manages costs.
// Sprint 2 will integrate this with the actual planning runner.

const MAX_CONCURRENT = env.PIPELINE_MAX_CONCURRENT;

let activeCount = 0;
const waitQueue = [];

async function enqueue(fn) {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    try {
      return await fn();
    } finally {
      activeCount--;
      _drain();
    }
  }

  const position = waitQueue.length + 1;
  logger.info('pipeline-queue: request queued', { position, activeCount, max: MAX_CONCURRENT });

  return new Promise((resolve, reject) => {
    waitQueue.push({ fn, resolve, reject, queuedAt: Date.now() });
  });
}

function _drain() {
  if (waitQueue.length === 0 || activeCount >= MAX_CONCURRENT) return;
  const next = waitQueue.shift();
  activeCount++;
  const waited = Date.now() - next.queuedAt;
  logger.info('pipeline-queue: dequeued', { waited, remaining: waitQueue.length });
  Promise.resolve(next.fn())
    .then(next.resolve)
    .catch(next.reject)
    .finally(() => { activeCount--; _drain(); });
}

function getStats() {
  return { activeCount, queued: waitQueue.length, max: MAX_CONCURRENT };
}

module.exports = { enqueue, getStats };
