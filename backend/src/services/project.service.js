const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');

async function create({ title, idea, ownerId }) {
  const project = await Project.create({ title, idea, ownerId });
  return project.toObject();
}

async function listByOwner(ownerId) {
  return Project.find({ ownerId }).sort('-createdAt').lean();
}

async function getById(id, ownerId) {
  const project = await Project.findById(id).lean();
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(ownerId)) throw ApiError.forbidden();
  return project;
}

async function saveDiscoveryAnswers(id, ownerId, answers) {
  const project = await Project.findById(id);
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(ownerId)) throw ApiError.forbidden();
  if (project.status !== 'onboarding') throw ApiError.badRequest('Discovery already completed');

  project.discoveryAnswers = answers;
  project.status = 'planning';
  await project.save();
  return project.toObject();
}

module.exports = { create, listByOwner, getById, saveDiscoveryAnswers };
