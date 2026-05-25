const env    = require('../config/env');
const logger = require('../utils/logger');

const RENDER_BASE = 'https://api.render.com/v1';

async function _renderRequest(method, path, body) {
  if (!env.RENDER_API_KEY) throw new Error('RENDER_API_KEY not configured');

  const res = await fetch(`${RENDER_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${env.RENDER_API_KEY}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Render API ${method} ${path} → ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// Deploy a web service linked to a GitHub repo.
// Returns { serviceId, serviceUrl } — URL is available once Render builds.
async function deployService(projectId, repoFullName, mongoUri, extraEnvVars = []) {
  if (!env.RENDER_OWNER_ID) throw new Error('RENDER_OWNER_ID not configured');

  const serviceName = `pp-${projectId.toString().slice(-8)}`;
  const repoUrl     = `https://github.com/${repoFullName}`;

  const baseEnvVars = [
    { key: 'MONGO_URI', value: mongoUri },
    { key: 'NODE_ENV',  value: 'production' },
    { key: 'PORT',      value: '10000' },
  ];

  const payload = {
    type:        'web_service',
    name:        serviceName,
    ownerId:     env.RENDER_OWNER_ID,
    serviceDetails: {
      env:          'node',
      plan:         'free',
      region:       'oregon',
      branch:       'main',
      buildCommand: 'npm install && cd frontend && npm install && npm run build && cd ../backend && npm install',
      startCommand: 'node backend/server.js',
      envVars:      [...baseEnvVars, ...extraEnvVars],
    },
    repo: repoUrl,
  };

  const data = await _renderRequest('POST', '/services', payload);
  const serviceId  = data.id || data.service?.id;
  const serviceUrl = data.service?.serviceDetails?.url
    || `https://${serviceName}.onrender.com`;

  return { serviceId, serviceUrl };
}

// Poll until deploy is live (up to 10 minutes)
async function waitForDeploy(serviceId, onProgress) {
  const MAX_POLLS = 60;
  const INTERVAL  = 10_000; // 10 seconds

  for (let i = 0; i < MAX_POLLS; i++) {
    await _sleep(INTERVAL);
    try {
      const deploys = await _renderRequest('GET', `/services/${serviceId}/deploys?limit=1`);
      const deploy  = deploys[0]?.deploy || deploys[0];
      const status  = deploy?.status;
      if (onProgress) onProgress(status);
      if (status === 'live')   return 'live';
      if (status === 'failed') throw new Error('Render deploy failed');
    } catch (err) {
      logger.warn('render-provision: poll error', { error: err.message });
    }
  }
  throw new Error('Render deploy timed out after 10 minutes');
}

async function deleteService(serviceId) {
  if (!serviceId) return;
  try {
    await _renderRequest('DELETE', `/services/${serviceId}`);
  } catch (_) {
    // non-fatal
  }
}

function _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = { deployService, waitForDeploy, deleteService };
