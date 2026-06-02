const User    = require('../models/User');
const logger  = require('../utils/logger');

const WEBHOOK_TIMEOUT_MS = 8000;

/**
 * Fire-and-forget webhook to user's configured URL.
 * Silently swallows errors — never blocks the pipeline.
 */
async function sendWebhook(userId, event, payload) {
  try {
    const user = await User.findById(userId).select('+settings.webhookUrl').lean();
    const url  = user?.settings?.webhookUrl;
    if (!url) return;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT_MS);

    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-PowerPlan-Event': event },
      body,
      signal:  ctrl.signal,
    });
    clearTimeout(timer);
    logger.info('webhook.service: sent', { userId, event });
  } catch (err) {
    logger.warn('webhook.service: failed', { userId, event, error: err.message });
  }
}

module.exports = { sendWebhook };
