const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env    = require('../config/env');
const logger = require('../utils/logger');

// Returns true only when all four R2 env vars are set
function isConfigured() {
  return !!(env.CF_R2_ACCOUNT_ID && env.CF_R2_ACCESS_KEY_ID &&
            env.CF_R2_SECRET_ACCESS_KEY && env.CF_R2_BUCKET_NAME);
}

function _getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     env.CF_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CF_R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads text content to R2.
 * @param {string} key  — e.g. "projects/abc123/src/index.js"
 * @param {string} content
 * @returns {string} the key (used to reference the object later)
 */
async function upload(key, content) {
  const client = _getClient();
  await client.send(new PutObjectCommand({
    Bucket:      env.CF_R2_BUCKET_NAME,
    Key:         key,
    Body:        content,
    ContentType: 'text/plain; charset=utf-8',
  }));
  logger.debug('r2: uploaded', { key, bytes: content.length });
  return key;
}

/**
 * Deletes an object from R2 (best-effort, non-throwing).
 */
async function remove(key) {
  try {
    const client = _getClient();
    await client.send(new DeleteObjectCommand({ Bucket: env.CF_R2_BUCKET_NAME, Key: key }));
    logger.debug('r2: deleted', { key });
  } catch (err) {
    logger.warn('r2: delete failed (non-fatal)', { key, error: err.message });
  }
}

/**
 * Builds the R2 key for a generated file.
 * Pattern: "projects/<projectId>/<filePath>"
 */
function buildKey(projectId, filePath) {
  // Sanitize filePath: strip leading slashes, collapse ..
  const safe = filePath.replace(/\.\./g, '').replace(/^\/+/, '');
  return `projects/${projectId}/${safe}`;
}

module.exports = { isConfigured, upload, remove, buildKey };
