const crypto = require('crypto');
const env    = require('../config/env');

const ATLAS_BASE = 'https://cloud.mongodb.com/api/atlas/v2';

// MongoDB Atlas uses HTTP Digest Authentication
async function _atlasRequest(method, path, body) {
  const url   = `${ATLAS_BASE}${path}`;
  const nonce = crypto.randomBytes(8).toString('hex');

  // Step 1: get realm/qop from 401 response
  const init = await fetch(url, { method, headers: { Accept: 'application/vnd.atlas.2023-02-01+json' } });
  const wwwAuth = init.headers.get('www-authenticate') || '';

  const realm = (wwwAuth.match(/realm="([^"]+)"/) || [])[1] || 'cloud.mongodb.com';
  const qop   = (wwwAuth.match(/qop="([^"]+)"/)   || [])[1] || 'auth';
  const serverNonce = (wwwAuth.match(/nonce="([^"]+)"/) || [])[1] || nonce;

  // Step 2: build digest
  const ha1  = md5(`${env.ATLAS_PUBLIC_KEY}:${realm}:${env.ATLAS_PRIVATE_KEY}`);
  const ha2  = md5(`${method}:${path}`);
  const nc   = '00000001';
  const cnonce = crypto.randomBytes(4).toString('hex');
  const response = md5(`${ha1}:${serverNonce}:${nc}:${cnonce}:${qop}:${ha2}`);

  const authHeader = [
    `Digest username="${env.ATLAS_PUBLIC_KEY}"`,
    `realm="${realm}"`,
    `nonce="${serverNonce}"`,
    `uri="${path}"`,
    `qop=${qop}`,
    `nc=${nc}`,
    `cnonce="${cnonce}"`,
    `response="${response}"`,
  ].join(', ');

  const opts = {
    method,
    headers: {
      Accept:         'application/vnd.atlas.2023-02-01+json',
      'Content-Type': 'application/json',
      Authorization:  authHeader,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Atlas API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function _makeSlug(projectId) {
  return projectId.toString().slice(-10);
}

async function provisionDatabase(projectId) {
  if (!env.ATLAS_PUBLIC_KEY || !env.ATLAS_PRIVATE_KEY || !env.ATLAS_PROJECT_ID) {
    throw new Error('MongoDB Atlas credentials not configured');
  }

  const slug    = _makeSlug(projectId);
  const dbName  = `pp_${slug}`;
  const dbUser  = `user_${slug}`;
  const dbPass  = crypto.randomBytes(20).toString('base64url');

  // Create a dedicated DB user scoped to this database
  await _atlasRequest('POST', `/groups/${env.ATLAS_PROJECT_ID}/databaseUsers`, {
    databaseName: 'admin',
    username:     dbUser,
    password:     dbPass,
    roles:        [{ databaseName: dbName, roleName: 'readWrite' }],
  });

  // Build SRV connection string using the shared cluster host
  const mongoUri = `mongodb+srv://${dbUser}:${dbPass}@${env.ATLAS_CLUSTER_HOST}/${dbName}?retryWrites=true&w=majority`;

  return { mongoUri, dbName, mongoUser: dbUser };
}

async function dropDatabaseUser(projectId) {
  if (!env.ATLAS_PUBLIC_KEY || !env.ATLAS_PROJECT_ID) return;
  const slug   = _makeSlug(projectId);
  const dbUser = `user_${slug}`;
  try {
    await _atlasRequest('DELETE', `/groups/${env.ATLAS_PROJECT_ID}/databaseUsers/admin/${dbUser}`);
  } catch (_) {
    // non-fatal — cleanup best-effort
  }
}

module.exports = { provisionDatabase, dropDatabaseUser };
