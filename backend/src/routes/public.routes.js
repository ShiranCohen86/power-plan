/**
 * Sprint 121-123: public share viewer (no auth required)
 * Sprint 137: public REST API (API-key auth)
 */
const router     = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const shareService = require('../services/share.service');
const Phase        = require('../models/Phase');
const Document     = require('../models/Document');
const publicApiCtrl = require('../controllers/public-api.controller');

// ── Sprint 123: Shared project (read-only, no auth) ───────────────────────────
router.get('/share/:shareToken', asyncHandler(async (req, res) => {
  const project = await shareService.getSharedProject(req.params.shareToken);

  const phases = await Phase.find({ projectId: project._id })
    .select('type index status tokensUsed startedAt completedAt rating')
    .sort({ index: 1 }).lean();

  const docs = await Document.find({ projectId: project._id })
    .select('type summary isApproved version createdAt')
    .lean();

  res.json({
    project: {
      _id:               project._id,
      title:             project.title,
      idea:              project.idea,
      status:            project.status,
      completionPercent: project.completionPercent,
      deployedUrl:       project.deployedUrl,
      stack:             project.stack,
      createdAt:         project.createdAt,
    },
    phases,
    documents: docs,
  });
}));

// ── Sprint 137: Public API (API-key auth) ─────────────────────────────────────
router.get('/v1/projects',       publicApiCtrl.publicListProjects);
router.get('/v1/projects/:id',   publicApiCtrl.publicGetProject);
router.get('/v1/projects/:id/phases', publicApiCtrl.publicGetPhases);

module.exports = router;
