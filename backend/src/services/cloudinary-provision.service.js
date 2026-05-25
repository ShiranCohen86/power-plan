const crypto = require('crypto');
const env    = require('../config/env');

const CLOUDINARY_BASE = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}`;

function _authHeader() {
  // Cloudinary API uses HTTP Basic auth: API_KEY:API_SECRET
  const token = Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

// Create an unsigned upload preset scoped to a per-project folder.
// Returns the preset name.
async function createUploadPreset(projectId) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) return null;

  const presetName = `pp_${projectId.toString().slice(-10)}`;
  const folder     = `power-plan-projects/${projectId}`;

  const body = new URLSearchParams({
    name:              presetName,
    unsigned:          'true',
    folder,
    allowed_formats:   'jpg,jpeg,png,gif,webp,pdf,svg',
    max_file_size:     '10485760', // 10 MB
  });

  const res = await fetch(`${CLOUDINARY_BASE}/upload_presets`, {
    method:  'POST',
    headers: {
      Authorization:  _authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cloudinary create preset failed: ${res.status} ${text}`);
  }

  return presetName;
}

async function deleteUploadPreset(presetName) {
  if (!presetName || !env.CLOUDINARY_CLOUD_NAME) return;
  try {
    await fetch(`${CLOUDINARY_BASE}/upload_presets/${presetName}`, {
      method:  'DELETE',
      headers: { Authorization: _authHeader() },
    });
  } catch (_) {
    // non-fatal cleanup
  }
}

// Returns Render env-var pairs for the generated app
function getEnvVars(presetName) {
  if (!env.CLOUDINARY_CLOUD_NAME || !presetName) return [];
  return [
    { key: 'CLOUDINARY_CLOUD_NAME',   value: env.CLOUDINARY_CLOUD_NAME },
    { key: 'CLOUDINARY_API_KEY',      value: env.CLOUDINARY_API_KEY },
    { key: 'CLOUDINARY_API_SECRET',   value: env.CLOUDINARY_API_SECRET },
    { key: 'CLOUDINARY_UPLOAD_PRESET', value: presetName },
  ];
}

module.exports = { createUploadPreset, deleteUploadPreset, getEnvVars };
