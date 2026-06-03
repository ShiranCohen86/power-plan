/**
 * Sprint 127-128: phase comments
 */
const asyncHandler        = require('../utils/asyncHandler');
const ApiError            = require('../utils/ApiError');
const PhaseComment        = require('../models/PhaseComment');
const projectService      = require('../services/project.service');
const notifService        = require('../services/notification.service');
const Project             = require('../models/Project');

exports.listComments = asyncHandler(async (req, res) => {
  const { phaseIndex } = req.params;
  await _assertAccess(req.params.projectId, req.user.id);

  const comments = await PhaseComment.find({
    projectId:  req.params.projectId,
    phaseIndex: Number(phaseIndex),
  }).sort({ createdAt: 1 }).lean();

  res.json(comments);
});

exports.addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) throw ApiError.badRequest('text required');

  const project = await _assertAccess(req.params.projectId, req.user.id);

  const comment = await PhaseComment.create({
    projectId:  req.params.projectId,
    phaseIndex: Number(req.params.phaseIndex),
    userId:     req.user.id,
    userName:   req.user.name || req.user.email,
    text:       text.trim().slice(0, 2000),
  });

  // Notify project owner if commenter is not the owner
  if (String(project.ownerId) !== String(req.user.id)) {
    await notifService.create({
      userId:    project.ownerId,
      projectId: project._id,
      type:      'info',
      title:     'New comment on your project',
      message:   `${comment.userName} commented on phase ${req.params.phaseIndex} of "${project.title}"`,
    }).catch(() => {});
  }

  res.status(201).json(comment);
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await PhaseComment.findById(req.params.commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const isOwner = String(comment.userId) === String(req.user.id);
  const project = await Project.findById(comment.projectId).lean();
  const isProjectOwner = project && String(project.ownerId) === String(req.user.id);

  if (!isOwner && !isProjectOwner) throw ApiError.forbidden();

  await comment.deleteOne();
  res.json({ ok: true });
});

// Returns project if user has read access (owner or accepted collaborator)
async function _assertAccess(projectId, userId) {
  const ProjectCollaborator = require('../models/ProjectCollaborator');
  const project = await Project.findOne({ _id: projectId, deletedAt: null }).lean();
  if (!project) throw ApiError.notFound('Project not found');

  const isOwner = String(project.ownerId) === String(userId);
  if (isOwner) return project;

  const collab = await ProjectCollaborator.findOne({
    projectId,
    userId,
    status: 'accepted',
  }).lean();
  if (!collab) throw ApiError.forbidden();
  return project;
}
