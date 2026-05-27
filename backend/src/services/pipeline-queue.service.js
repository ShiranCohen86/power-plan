const env = require('../config/env');
const logger = require('../utils/logger');

// Global rate limiter — max N concurrent Claude API calls across all pipelines.
// Prevents overwhelming the Anthropic API and manages costs.

const MAX_CONCURRENT = env.PIPELINE_MAX_CONCURRENT;
// A single Claude streaming call should never take longer than this.
// Default: 10 minutes. Configurable via PIPELINE_JOB_TIMEOUT_MS env var.
const JOB_TIMEOUT_MS = parseInt(process.env.PIPELINE_JOB_TIMEOUT_MS, 10) || 10 * 60 * 1000;

let activeCount = 0;
const waitQueue = [];

function _withTimeout(fn) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Pipeline job timed out after ${JOB_TIMEOUT_MS / 1000}s`);
      err.code = 'PIPELINE_TIMEOUT';
      reject(err);
    }, JOB_TIMEOUT_MS);

    Promise.resolve(fn())
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((err)   => { clearTimeout(timer); reject(err); });
  });
}

async function enqueue(fn) {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    try {
      return await _withTimeout(fn);
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
  _withTimeout(next.fn)
    .then(next.resolve)
    .catch(next.reject)
    .finally(() => { activeCount--; _drain(); });
}

function getStats() {
  return { activeCount, queued: waitQueue.length, max: MAX_CONCURRENT, timeoutMs: JOB_TIMEOUT_MS };
}

module.exports = { enqueue, getStats };
