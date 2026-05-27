const Anthropic = require('@anthropic-ai/sdk');
const crypto = require('crypto');
const env = require('../../config/env');

let _platformClient = null;

function getPlatformClient() {
  if (!_platformClient) {
    _platformClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _platformClient;
}

// Cache user-specific clients keyed by a SHA-256 hash of the API key so we
// reuse the underlying HTTP connection pool instead of creating a new socket
// per agent invocation. Capped at 100 entries to bound memory usage.
const _userClientCache = new Map(); // keyHash → Anthropic instance
const MAX_USER_CLIENTS = 100;

function _getOrCreateUserClient(apiKey) {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  if (_userClientCache.has(keyHash)) return _userClientCache.get(keyHash);

  const client = new Anthropic({ apiKey });
  if (_userClientCache.size >= MAX_USER_CLIENTS) {
    // Evict oldest entry (Map preserves insertion order)
    const firstKey = _userClientCache.keys().next().value;
    _userClientCache.delete(firstKey);
  }
  _userClientCache.set(keyHash, client);
  return client;
}

// Returns { client, model } appropriate for the user's plan.
// For Starter plan: use user's own API key + Haiku model.
// For Pro plan (or no plan): use platform key + Sonnet model.
function getClientForUser(userPlan, userApiKey) {
  if (userPlan === 'starter' && userApiKey) {
    return {
      client: _getOrCreateUserClient(userApiKey),
      model:  env.ANTHROPIC_MODEL_STARTER,
    };
  }
  return {
    client: getPlatformClient(),
    model:  env.ANTHROPIC_MODEL,
  };
}

module.exports = { getPlatformClient, getClientForUser, MAX_TOKENS: 4000 };
