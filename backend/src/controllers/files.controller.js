const archiver     = require('archiver');
const asyncHandler = require('../utils/asyncHandler');
const ApiError     = require('../utils/ApiError');
const Project      = require('../models/Project');
const GeneratedFile = require('../models/GeneratedFile');
const logger       = require('../utils/logger');

exports.listFiles = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const files = await GeneratedFile.find({ projectId: req.params.id })
    .select('filePath language status createdAt')
    .sort('filePath')
    .lean();

  const withSize = files.map((f) => ({
    filePath: f.filePath,
    language: f.language,
    status:   f.status,
    createdAt: f.createdAt,
  }));

  res.json({ files: withSize, total: withSize.length });
});

exports.downloadFiles = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, ownerId: req.user.id }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const files = await GeneratedFile.find({
    projectId: req.params.id,
    status:    { $in: ['validated', 'generated'] },
  }).select('filePath content').lean();

  if (!files.length) throw ApiError.badRequest('No generated files found for this project');

  const slug = (project.title || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-source.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    logger.error('files: archive error', { projectId: req.params.id, error: err.message });
    if (!res.headersSent) res.status(500).json({ error: 'Archive failed' });
  });

  archive.pipe(res);

  for (const file of files) {
    archive.append(file.content, { name: file.filePath });
  }

  await archive.finalize();
  logger.info('files: downloaded', { projectId: req.params.id, count: files.length });
});
