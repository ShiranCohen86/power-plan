const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const Project      = require('../models/Project');
const User         = require('../models/User');
const Document     = require('../models/Document');
const registry     = require('../config/serviceRegistry');
const { encrypt, decrypt } = require('../services/encryption.service');
const logger       = require('../utils/logger');

exports.getRequiredServices = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const services = (project.requiredServices || []).map((s) => ({
    id:                  s.serviceId,
    name:                registry[s.serviceId]?.name     || s.serviceId,
    fields:              registry[s.serviceId]?.fields   || [],
    howto:               registry[s.serviceId]?.howto    || '',
    optional:            registry[s.serviceId]?.optional ?? true,
    credentialsProvided: s.credentialsProvided,
    skipped:             s.skipped || false,
  }));

  res.json({ services });
});

exports.saveServiceCredentials = asyncHandler(async (req, res) => {
  const { serviceId }   = req.params;
  const { credentials } = req.body;

  if (!credentials || typeof credentials !== 'object') {
    throw ApiError.badRequest('credentials must be an object');
  }
  if (!registry[serviceId]) throw ApiError.badRequest(`Unknown service: ${serviceId}`);

  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id })
    .select('+requiredServices.credentials');
  if (!project) throw ApiError.notFound('Project not found');

  let svc = project.requiredServices.find((s) => s.serviceId === serviceId);
  if (!svc) {
    project.requiredServices.push({ serviceId, credentialsProvided: false });
    svc = project.requiredServices[project.requiredServices.length - 1];
  }

  if (!svc.credentials) svc.credentials = new Map();
  for (const [key, val] of Object.entries(credentials)) {
    if (typeof val === 'string' && val.trim()) {
      svc.credentials.set(key, encrypt(val.trim()));
    }
  }
  svc.credentialsProvided = true;
  await project.save();

  const allDone = project.requiredServices.every((s) => s.credentialsProvided || s.skipped);
  if (allDone && project.status === 'awaiting_credentials') {
    await Project.findByIdAndUpdate(req.params.id, { status: 'planning' });
    const { startCodegen } = require('../services/codegen-runner.service');
    startCodegen(req.params.id).catch((err) =>
      logger.error('project-services: codegen resume failed', { error: err.message }),
    );
  }

  res.json({ ok: true, credentialsProvided: true, allDone });
});

exports.skipService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id });
  if (!project) throw ApiError.notFound('Project not found');

  let svc = project.requiredServices.find((s) => s.serviceId === serviceId);
  if (!svc) {
    project.requiredServices.push({ serviceId, credentialsProvided: false, skipped: true });
  } else {
    svc.skipped = true;
  }
  await project.save();

  const allDone = project.requiredServices.every((s) => s.credentialsProvided || s.skipped);
  if (allDone && project.status === 'awaiting_credentials') {
    await Project.findByIdAndUpdate(req.params.id, { status: 'planning' });
    const { startCodegen } = require('../services/codegen-runner.service');
    startCodegen(req.params.id).catch((err) =>
      logger.error('project-services: codegen resume after skip failed', { error: err.message }),
    );
  }

  res.json({ ok: true, skipped: true, allDone });
});

exports.consultService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;
  const serviceDef    = registry[serviceId];
  if (!serviceDef) throw ApiError.badRequest(`Unknown service: ${serviceId}`);

  const [project, projectWithKey, user] = await Promise.all([
    Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean(),
    Project.findById(req.params.id).select('+settings.anthropicApiKey').lean(),
    User.findById(req.user.id).select('+settings.anthropicApiKey plan').lean(),
  ]);
  if (!project) throw ApiError.notFound('Project not found');

  const projectKey  = projectWithKey?.settings?.anthropicApiKey
    ? decrypt(projectWithKey.settings.anthropicApiKey) : null;
  const userKey     = user?.settings?.anthropicApiKey
    ? decrypt(user.settings.anthropicApiKey) : null;
  const resolvedKey = projectKey || userKey;

  const { getClientForUser, getPlatformClient } = require('../services/ai/claude.client');
  const env = require('../config/env');
  const { client, model } = resolvedKey
    ? getClientForUser(user?.plan || 'starter', resolvedKey)
    : { client: getPlatformClient(), model: env.ANTHROPIC_MODEL };

  const docs = await Document.find({ projectId: req.params.id })
    .sort({ createdAt: 1 }).limit(4).select('content type').lean();

  const docSummary = docs.map((d) => `[${d.type}]\n${d.content.slice(0, 500)}`).join('\n\n---\n\n');

  const prompt = `פרויקט: "${project.title}"
רעיון: ${project.idea || '—'}

תיעוד תכנון (קטעים נבחרים):
${docSummary || 'אין מסמכים עדיין'}

שירות חיצוני: ${serviceDef.name}
${serviceDef.howto ? `(איך מקבלים: ${serviceDef.howto})` : ''}

ענה בעברית ב-3 נקודות קצרות (משפט-שניים כל אחד):
1. מה השירות הזה עושה באפליקציה הספציפית הזו
2. מה יחסר אם הלקוח ידלג עליו
3. המלצה: לדלג / לא לדלג (ולמה)`;

  const response = await client.messages.create({
    model,
    max_tokens: 400,
    messages:   [{ role: 'user', content: prompt }],
  });

  const explanation = response.content[0]?.text?.trim() || 'לא ניתן לייצר הסבר כרגע.';
  res.json({ explanation });
});
