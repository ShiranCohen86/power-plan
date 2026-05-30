const Task    = require('../models/Task');
const Sprint  = require('../models/Sprint');
const ApiError = require('../utils/ApiError');

async function listByProject(projectId) {
  return Task.find({ projectId }).sort({ epicTitle: 1, featureTitle: 1, createdAt: 1 }).lean();
}

async function listBySprint(projectId, sprintIndex) {
  return Task.find({ projectId, sprintIndex }).sort({ priority: 1, createdAt: 1 }).lean();
}

async function getEpicTree(projectId) {
  const tasks = await Task.find({ projectId }).sort({ createdAt: 1 }).lean();

  const epicMap = new Map();
  for (const task of tasks) {
    if (!epicMap.has(task.epicTitle)) {
      epicMap.set(task.epicTitle, { title: task.epicTitle, features: new Map() });
    }
    const epic = epicMap.get(task.epicTitle);
    if (!epic.features.has(task.featureTitle)) {
      epic.features.set(task.featureTitle, { title: task.featureTitle, tasks: [] });
    }
    epic.features.get(task.featureTitle).tasks.push(task);
  }

  return Array.from(epicMap.values()).map((epic) => ({
    title:    epic.title,
    features: Array.from(epic.features.values()),
  }));
}

async function updateStatus(taskId, projectId, status) {
  const task = await Task.findOne({ _id: taskId, projectId });
  if (!task) throw ApiError.notFound('Task not found');
  task.status = status;
  await task.save();

  // Update sprint task counts — parallel countDocuments avoids loading all tasks into memory
  if (task.sprintIndex != null) {
    const sprintFilter = { projectId, sprintIndex: task.sprintIndex };
    const [taskCount, completedTaskCount] = await Promise.all([
      Task.countDocuments(sprintFilter),
      Task.countDocuments({ ...sprintFilter, status: { $in: ['deployed', 'testing'] } }),
    ]);
    await Sprint.findOneAndUpdate(
      { projectId, index: task.sprintIndex },
      { taskCount, completedTaskCount },
    );
  }

  return task.toObject();
}

module.exports = { listByProject, listBySprint, getEpicTree, updateStatus };
