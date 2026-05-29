const Project = require('../models/Project');
const User    = require('../models/User');
const { decrypt } = require('./encryption.service');

/**
 * Resolves the Anthropic API key for a project.
 * Priority: project-specific key → user global key.
 * Returns null if neither is configured.
 */
async function resolveApiKey(projectId, ownerId) {
  const [user, projectWithKey] = await Promise.all([
    User.findById(ownerId).select('+settings.anthropicApiKey').lean(),
    Project.findById(projectId).select('+settings.anthropicApiKey').lean(),
  ]);

  if (projectWithKey?.settings?.anthropicApiKey) {
    try { return { apiKey: decrypt(projectWithKey.settings.anthropicApiKey), plan: user?.plan || 'starter' }; }
    catch { /* invalid ciphertext */ }
  }
  if (user?.settings?.anthropicApiKey) {
    try { return { apiKey: decrypt(user.settings.anthropicApiKey), plan: user?.plan || 'starter' }; }
    catch { /* invalid ciphertext */ }
  }
  return { apiKey: null, plan: user?.plan || 'starter' };
}

/**
 * Decrypts all stored service credentials for a project.
 * Returns a flat env-var map: { KEY: 'value', ... }
 */
async function resolveServiceEnv(projectId) {
  const project = await Project.findById(projectId)
    .select('+requiredServices.credentials')
    .lean();
  const env = {};
  for (const svc of (project?.requiredServices || [])) {
    if (!svc.credentials) continue;
    for (const [key, encVal] of Object.entries(svc.credentials)) {
      try { env[key] = decrypt(encVal); } catch { /* skip invalid */ }
    }
  }
  return env;
}

module.exports = { resolveApiKey, resolveServiceEnv };
