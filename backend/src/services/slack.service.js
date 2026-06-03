/**
 * Sprint 134: Slack integration — send pipeline events to a Slack channel via Incoming Webhook URL
 */
const logger = require('../utils/logger');

const SLACK_TIMEOUT_MS = 6000;

/**
 * Post a message to the user's Slack webhook URL (stored in User.settings.slackWebhookUrl).
 * Fire-and-forget — never blocks the pipeline.
 */
async function sendSlackMessage(slackWebhookUrl, event, payload) {
  if (!slackWebhookUrl) return;

  const text = _buildMessage(event, payload);
  const body = JSON.stringify({ text });

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SLACK_TIMEOUT_MS);

  try {
    const res = await fetch(slackWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal:  ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) logger.warn('slack.service: non-ok response', { status: res.status, event });
    else logger.info('slack.service: sent', { event });
  } catch (err) {
    clearTimeout(timer);
    logger.warn('slack.service: failed', { event, error: err.message });
  }
}

function _buildMessage(event, payload) {
  const title   = payload?.title    || payload?.projectTitle || '';
  const message = payload?.message  || '';
  const url     = payload?.deployedUrl || '';

  switch (event) {
    case 'pipeline:started':    return `*Power Plan* — Pipeline started for *${title}*`;
    case 'pipeline:completed':  return `*Power Plan* — Pipeline completed for *${title}*${url ? `\n🌐 <${url}|View live app>` : ''}`;
    case 'pipeline:failed':     return `*Power Plan* — Pipeline failed for *${title}*${message ? `\nError: ${message}` : ''}`;
    case 'pipeline:paused':     return `*Power Plan* — Pipeline paused for *${title}*`;
    case 'phase:completed':     return `*Power Plan* — Phase completed for *${title}*`;
    case 'deployment:success':  return `*Power Plan* — App deployed for *${title}* 🚀${url ? `\n🌐 <${url}|${url}>` : ''}`;
    default:                    return `*Power Plan* — ${event} for *${title}*`;
  }
}

/** Notify user's Slack (if configured) about a pipeline event. */
async function notifyUser(userId, event, payload) {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('+settings.slackWebhookUrl').lean();
    const url  = user?.settings?.slackWebhookUrl;
    if (url) await sendSlackMessage(url, event, payload);
  } catch (err) {
    logger.warn('slack.service: notifyUser error', { userId, error: err.message });
  }
}

module.exports = { sendSlackMessage, notifyUser };
