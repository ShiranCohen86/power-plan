const Anthropic = require('@anthropic-ai/sdk');
const env = require('../../config/env');

let _platformClient = null;

function getPlatformClient() {
  if (!_platformClient) {
    _platformClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _platformClient;
}

// Returns { client, model } appropriate for the user's plan.
// For Starter plan: use user's own API key + Haiku model.
// For Pro plan (or no plan): use platform key + Sonnet model.
function getClientForUser(userPlan, userApiKey) {
  if (userPlan === 'starter' && userApiKey) {
    return {
      client: new Anthropic({ apiKey: userApiKey }),
      model:  env.ANTHROPIC_MODEL_STARTER,
    };
  }
  return {
    client: getPlatformClient(),
    model:  env.ANTHROPIC_MODEL,
  };
}

module.exports = { getPlatformClient, getClientForUser, MAX_TOKENS: 4000 };
