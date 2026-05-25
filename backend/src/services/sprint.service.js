const Sprint  = require('../models/Sprint');
const Task    = require('../models/Task');
const ApiError = require('../utils/ApiError');

async function listByProject(projectId) {
  return Sprint.find({ projectId }).sort('index').lean();
}

async function getOne(projectId, sprintIndex) {
  const sprint = await Sprint.findOne({ projectId, index: Number(sprintIndex) }).lean();
  if (!sprint) throw ApiError.notFound('Sprint not found');
  return sprint;
}

async function updateStatus(projectId, sprintIndex, status) {
  const sprint = await Sprint.findOne({ projectId, index: Number(sprintIndex) });
  if (!sprint) throw ApiError.notFound('Sprint not found');
  sprint.status = status;
  await sprint.save();
  return sprint.toObject();
}

module.exports = { listByProject, getOne, updateStatus };
