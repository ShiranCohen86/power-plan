const registry = require('../config/serviceRegistry');
const Project  = require('../models/Project');
const Document = require('../models/Document');
const { emitToProject } = require('../sockets');
const logger   = require('../utils/logger');

/**
 * Scans AI-generated document text for known third-party service keywords.
 * Returns array of serviceIds found.
 */
function detectRequiredServices(documentText) {
  const text = documentText.toLowerCase();
  return Object.entries(registry)
    .filter(([, svc]) => svc.keywords.some((kw) => text.includes(kw)))
    .map(([id]) => id);
}

/**
 * Called after planning completes. Scans TechArchitect + SystemDesign docs,
 * compares against already-provided credentials, and pauses the pipeline if
 * any required service credentials are missing.
 *
 * Returns true if pipeline was paused (credentials needed), false to continue.
 */
async function detectAndPauseForCredentials(projectId) {
  const docs = await Document.find({
    projectId,
    phaseType: { $in: ['tech_architecture', 'system_design'] },
  }).lean();

  if (!docs.length) return false;

  const combinedText  = docs.map((d) => d.content).join('\n');
  const detectedIds   = detectRequiredServices(combinedText);
  if (!detectedIds.length) return false;

  const project = await Project.findById(projectId).lean();
  const existing = project.requiredServices || [];

  const missing = detectedIds.filter(
    (id) => !existing.find((s) => s.serviceId === id && s.credentialsProvided),
  );
  if (!missing.length) return false;

  // Upsert missing services (don't overwrite existing ones)
  const toAdd = missing.filter((id) => !existing.find((s) => s.serviceId === id));
  if (toAdd.length) {
    await Project.findByIdAndUpdate(projectId, {
      $push: { requiredServices: { $each: toAdd.map((id) => ({ serviceId: id })) } },
    });
  }

  await Project.findByIdAndUpdate(projectId, { status: 'awaiting_credentials' });

  emitToProject(projectId, 'pipeline:awaiting_credentials', {
    services: missing.map((id) => ({
      id,
      name:   registry[id].name,
      fields: registry[id].fields,
      howto:  registry[id].howto,
    })),
  });

  logger.info('service-detector: paused for credentials', { projectId, services: missing });
  return true;
}

module.exports = { detectRequiredServices, detectAndPauseForCredentials };
