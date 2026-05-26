const Project        = require('../models/Project');
const Phase          = require('../models/Phase');
const Document       = require('../models/Document');
const GeneratedFile  = require('../models/GeneratedFile');
const Notification   = require('../models/Notification');
const Task           = require('../models/Task');
const Sprint         = require('../models/Sprint');
const Meeting        = require('../models/Meeting');
const MeetingMessage = require('../models/MeetingMessage');
const AgentLog       = require('../models/AgentLog');
const ApiError       = require('../utils/ApiError');

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

async function deleteProject(id, ownerId) {
  const project = await Project.findById(id);
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(ownerId)) throw ApiError.forbidden();

  const meetings = await Meeting.find({ projectId: id }, '_id').lean();
  const meetingIds = meetings.map((m) => m._id);

  await Promise.all([
    Phase.deleteMany({ projectId: id }),
    Document.deleteMany({ projectId: id }),
    GeneratedFile.deleteMany({ projectId: id }),
    Notification.deleteMany({ projectId: id }),
    Task.deleteMany({ projectId: id }),
    Sprint.deleteMany({ projectId: id }),
    AgentLog.deleteMany({ projectId: id }),
    Meeting.deleteMany({ projectId: id }),
    meetingIds.length ? MeetingMessage.deleteMany({ meetingId: { $in: meetingIds } }) : Promise.resolve(),
  ]);

  await Project.findByIdAndDelete(id);
}

module.exports = { create, listByOwner, getById, saveDiscoveryAnswers, deleteProject };
