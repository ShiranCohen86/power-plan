const asyncHandler = require('../utils/asyncHandler');
const AgentLog     = require('../models/AgentLog');
const projectService = require('../services/project.service');

exports.getLogs = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id); // ownership check
  const logs = await AgentLog
    .find({ projectId: req.params.projectId })
    .sort('-timestamp')
    .limit(100)
    .lean();
  res.json({ items: logs.reverse() });
});
