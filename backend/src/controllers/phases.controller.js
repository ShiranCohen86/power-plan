const asyncHandler = require('../utils/asyncHandler');
const Phase        = require('../models/Phase');
const Document     = require('../models/Document');
const projectService = require('../services/project.service');
const ApiError     = require('../utils/ApiError');

exports.list = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id); // ownership check
  const phases = await Phase.find({ projectId: req.params.projectId }).sort('index').lean();
  res.json({ items: phases });
});

exports.getDocument = asyncHandler(async (req, res) => {
  await projectService.getById(req.params.projectId, req.user.id);
  const phase = await Phase.findOne({ projectId: req.params.projectId, index: Number(req.params.phaseIndex) }).lean();
  if (!phase) throw ApiError.notFound('Phase not found');
  const doc = await Document.findOne({ phaseId: phase._id }).lean();
  if (!doc) throw ApiError.notFound('Document not found');
  res.json(doc);
});
