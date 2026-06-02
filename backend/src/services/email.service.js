const env  = require('../config/env');
const logger = require('../utils/logger');
const User = require('../models/User');

// Returns true if the user has this notification enabled (defaults to true when unset)
async function _prefEnabled(userId, prefKey) {
  if (!userId) return true;
  try {
    const user = await User.findById(userId).select('notifPrefs').lean();
    const pref = user?.notifPrefs?.[prefKey];
    return pref !== false;
  } catch { return true; }
}

const DEFAULT_FROM = env.RESEND_FROM || 'Power Plan <hello@powerplan.app>';

// Lazily resolve Resend so the service still loads when RESEND_API_KEY is absent
async function _getResend() {
  const { Resend } = require('resend');
  return new Resend(env.RESEND_API_KEY);
}

// Shared send wrapper — guards missing key/recipient, normalizes try/catch and logging
async function _send({ to, subject, html, context, meta = {} }) {
  if (!env.RESEND_API_KEY) return;
  if (!to) {
    logger.warn('email.service: missing recipient', { context, ...meta });
    return;
  }
  try {
    const resend = await _getResend();
    await resend.emails.send({ from: DEFAULT_FROM, to, subject, html });
    logger.info(`email.service: ${context} email sent`, { to, ...meta });
  } catch (err) {
    logger.warn(`email.service: failed to send ${context} email`, { error: err.message, ...meta });
  }
}

/**
 * Send "your app is live!" email to the project owner.
 */
async function sendDeploymentSuccess({ to, userName, projectTitle, liveUrl, githubUrl, userId }) {
  if (!await _prefEnabled(userId, 'deploymentSuccess')) return;
  await _send({
    to,
    subject: `האפליקציה שלך מוכנה! 🎉 — ${projectTitle}`,
    html: _deploySuccessHtml({ userName, projectTitle, liveUrl, githubUrl }),
    context: 'deployment-success',
    meta: { projectTitle },
  });
}

/**
 * Send quota-exhausted warning email.
 */
async function sendQuotaExhausted({ to, userName, projectTitle, plan, userId }) {
  if (!await _prefEnabled(userId, 'quotaExhausted')) return;
  const subject = plan === 'starter'
    ? `נגמר הקרדיט ב-API שלך — ${projectTitle}`
    : `מגבלת שימוש הגיעה — ${projectTitle}`;
  await _send({
    to,
    subject,
    html: _quotaHtml({ userName, projectTitle, plan }),
    context: 'quota-exhausted',
    meta: { projectTitle },
  });
}

/**
 * Send "planning complete, codegen starting" email.
 */
async function sendPlanningComplete({ to, userName, projectTitle, userId }) {
  if (!await _prefEnabled(userId, 'planningComplete')) return;
  await _send({
    to,
    subject: `📋 האפיון של "${projectTitle}" הושלם — Claude מתחיל לכתוב קוד`,
    html: _planningCompleteHtml({ userName, projectTitle }),
    context: 'planning-complete',
    meta: { projectTitle },
  });
}

// ── HTML templates ────────────────────────────────────────────────────────────

function _deploySuccessHtml({ userName, projectTitle, liveUrl, githubUrl }) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;color:#e2e8f0;direction:rtl">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#111118;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center">
        <div style="font-size:48px">🎉</div>
        <h1 style="margin:12px 0 4px;color:#fff;font-size:24px;font-weight:800">האפליקציה שלך חיה!</h1>
        <p style="margin:0;color:rgba(255,255,255,.8);font-size:15px">${projectTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 36px">
        <p style="margin:0 0 8px;font-size:15px">שלום ${userName || 'יזם יקר'},</p>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.7">
          Power Plan סיים לבנות ולפרוס את האפליקציה שלך.<br>
          כל השלבים הושלמו — מהתכנון ועד לפריסה. הנה הלינק שלך:
        </p>

        <div style="text-align:center;margin:24px 0">
          <a href="${liveUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
            פתח את האפליקציה ←
          </a>
        </div>

        <div style="background:#0a0a0f;border-radius:10px;padding:16px 20px;margin-bottom:24px">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px">לינק ישיר:</div>
          <a href="${liveUrl}" style="color:#a78bfa;font-size:14px;word-break:break-all">${liveUrl}</a>
        </div>

        ${githubUrl ? `
        <div style="border-top:1px solid #1e1e2e;padding-top:20px;margin-top:4px">
          <p style="margin:0 0 12px;font-size:14px;color:#94a3b8">שלבים הבאים:</p>
          <a href="${githubUrl}" style="color:#a78bfa;font-size:14px">📦 צפה בקוד ב-GitHub</a>
        </div>` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 36px;border-top:1px solid #1e1e2e;text-align:center">
        <p style="margin:0;font-size:12px;color:#475569">
          Power Plan · AI Software Factory<br>
          <a href="https://powerplan.app" style="color:#64748b">powerplan.app</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function _quotaHtml({ userName, projectTitle, plan }) {
  const planLabel = plan === 'starter' ? 'Starter (מפתח עצמאי)' : 'Pro';
  const action = plan === 'starter'
    ? 'כדי להמשיך, תצטרך להטעין קרדיט חדש ב-Anthropic Console ואז לחזור לפרויקט ולהמשיך.'
    : 'אנא פנה לתמיכה של Power Plan כדי להרחיב את המכסה שלך.';

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;color:#e2e8f0;direction:rtl">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#111118;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
    <tr>
      <td style="background:#7c2d12;padding:28px 36px;text-align:center">
        <div style="font-size:40px">⚠️</div>
        <h1 style="margin:10px 0 4px;color:#fef3c7;font-size:20px;font-weight:800">הפייפליין הופסק</h1>
        <p style="margin:0;color:#fde68a;font-size:14px">${projectTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 36px">
        <p style="margin:0 0 16px;font-size:15px">שלום ${userName || ''},</p>
        <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.7">
          הפייפליין הופסק כי נגמר קרדיט ה-API שלך (פלן ${planLabel}).
        </p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.7">${action}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function _planningCompleteHtml({ userName, projectTitle }) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:system-ui,sans-serif;color:#e2e8f0;direction:rtl">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#111118;border-radius:16px;overflow:hidden;border:1px solid #1e1e2e">
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 36px;text-align:center">
        <div style="font-size:48px">📋</div>
        <h1 style="margin:12px 0 4px;color:#fff;font-size:22px;font-weight:800">האפיון הושלם!</h1>
        <p style="margin:0;color:rgba(255,255,255,.8);font-size:14px">${projectTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 36px">
        <p style="margin:0 0 8px;font-size:15px">שלום ${userName || 'יזם יקר'},</p>
        <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.7">
          כל 12 שלבי התכנון של <strong style="color:#e2e8f0">${projectTitle}</strong> הושלמו בהצלחה.<br>
          Claude עכשיו מתחיל לכתוב את הקוד — שלב הבנייה בדרך!
        </p>
        <div style="background:#0a0a0f;border-radius:10px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#64748b">מה הושלם:</p>
          <ul style="margin:0;padding-right:20px;color:#94a3b8;font-size:13px;line-height:2">
            <li>✅ ניתוח רעיון וסיכוני טכנולוגיה</li>
            <li>✅ PRD מלא עם personas ו-user stories</li>
            <li>✅ ארכיטקטורה טכנית ועיצוב מסד נתונים</li>
            <li>✅ תכנון ספרינטים ואסטרטגיית QA</li>
          </ul>
        </div>
        <p style="margin:0;color:#64748b;font-size:12px">תקבל email נוסף כשהאפליקציה תהיה מוכנה לחלוטין.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { sendDeploymentSuccess, sendQuotaExhausted, sendPlanningComplete };
