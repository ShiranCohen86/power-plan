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

const SORT_MAP = {
  date:       { createdAt: -1 },
  status:     { status: 1, createdAt: -1 },
  completion: { completionPercent: -1, createdAt: -1 },
};

async function listByOwner(ownerId, { page = 1, limit = 12, search = '', sort = 'date' } = {}) {
  const query = { ownerId };
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');
    query.$or = [{ title: re }, { idea: re }];
  }
  const sortQuery = SORT_MAP[sort] || SORT_MAP.date;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Project.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
    Project.countDocuments(query),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) || 1 };
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

async function saveDiscoveryProgress(id, ownerId, answers) {
  const project = await Project.findById(id);
  if (!project) throw ApiError.notFound('Project not found');
  if (String(project.ownerId) !== String(ownerId)) throw ApiError.forbidden();
  if (project.status !== 'onboarding') throw ApiError.badRequest('Discovery already completed');

  project.discoveryAnswers = answers;
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

module.exports = { create, listByOwner, getById, saveDiscoveryAnswers, saveDiscoveryProgress, deleteProject };
