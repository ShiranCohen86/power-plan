const User            = require('../models/User');
const WebhookDelivery = require('../models/WebhookDelivery');
const logger          = require('../utils/logger');

const WEBHOOK_TIMEOUT_MS = 8000;
const MAX_RETRIES        = 3;
const RETRY_DELAYS_MS    = [60_000, 300_000, 900_000]; // 1min, 5min, 15min

async function _sendOnce(url, event, payload, attempt = 1) {
  const body  = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT_MS);
  const t0    = Date.now();

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-PowerPlan-Event': event },
      body,
      signal:  ctrl.signal,
    });
    clearTimeout(timer);
    return { success: res.ok, statusCode: res.status, duration: Date.now() - t0, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { success: false, statusCode: null, duration: Date.now() - t0, error: err.message };
  }
}

/**
 * Fire-and-forget webhook to user's configured URL.
 * Records delivery attempts and retries on failure (up to MAX_RETRIES).
 */
async function sendWebhook(userId, event, payload, projectId = null) {
  try {
    const user = await User.findById(userId).select('+settings.webhookUrl').lean();
    const url  = user?.settings?.webhookUrl;
    if (!url) return;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const result = await _sendOnce(url, event, payload, attempt);

      await WebhookDelivery.create({
        userId,
        projectId: projectId || undefined,
        event,
        url,
        statusCode:   result.statusCode,
        success:      result.success,
        errorMessage: result.error,
        attempt,
        duration:     result.duration,
      }).catch(() => {});

      if (result.success) {
        logger.info('webhook.service: delivered', { userId, event, attempt });
        return;
      }

      logger.warn('webhook.service: attempt failed', { userId, event, attempt, error: result.error });

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
      }
    }
  } catch (err) {
    logger.warn('webhook.service: sendWebhook error', { userId, event, error: err.message });
  }
}

/** Get last 30 delivery records for a user. */
async function getDeliveryLog(userId, limit = 30) {
  return WebhookDelivery.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/** Send a test webhook event. */
async function sendTestWebhook(userId) {
  const user = await User.findById(userId).select('+settings.webhookUrl').lean();
  const url  = user?.settings?.webhookUrl;
  if (!url) throw new Error('No webhook URL configured');

  const result = await _sendOnce(url, 'test', { message: 'Power Plan webhook test' }, 1);
  await WebhookDelivery.create({
    userId,
    event:        'test',
    url,
    statusCode:   result.statusCode,
    success:      result.success,
    errorMessage: result.error,
    attempt:      1,
    duration:     result.duration,
  }).catch(() => {});
  return result;
}

module.exports = { sendWebhook, getDeliveryLog, sendTestWebhook };
