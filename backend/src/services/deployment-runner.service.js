const Project          = require('../models/Project');
const User             = require('../models/User');
const GeneratedFile    = require('../models/GeneratedFile');
const { encrypt }      = require('./encryption.service');
const atlas            = require('./mongo-atlas.service');
const github           = require('./github-provision.service');
const render           = require('./render-provision.service');
const resend           = require('./resend-provision.service');
const cloudinary       = require('./cloudinary-provision.service');
const email            = require('./email.service');
const notifSvc         = require('./notification.service');
const { emitToProject } = require('../sockets');
const logger           = require('../utils/logger');

async function runDeployment(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  try {
    await _setStatus(projectId, 'deploying');

    // ── Step 1: MongoDB Atlas ─────────────────────────────────────────────
    _step(projectId, 'mongo', 'running', 'יוצר מסד נתונים...');
    const { mongoUri, dbName, mongoUser } = await atlas.provisionDatabase(projectId);
    await Project.findByIdAndUpdate(projectId, {
      'infra.mongoDbName': dbName,
      'infra.mongoUser':   mongoUser,
      'infra.mongoUri':    encrypt(mongoUri),
    });
    _step(projectId, 'mongo', 'done', 'מסד נתונים מוכן ✓');

    // ── Step 2: Cloudinary upload preset ─────────────────────────────────
    _step(projectId, 'cloudinary', 'running', 'מגדיר אחסון מדיה...');
    const cloudinaryPreset = await cloudinary.createUploadPreset(projectId).catch(() => null);
    if (cloudinaryPreset) {
      await Project.findByIdAndUpdate(projectId, { 'infra.cloudinaryPreset': cloudinaryPreset });
    }
    _step(projectId, 'cloudinary', 'done', 'אחסון מדיה מוכן ✓');

    // ── Step 3: GitHub repo ───────────────────────────────────────────────
    _step(projectId, 'github', 'running', 'יוצר GitHub repo...');
    const { repoName, repoUrl, fullName } = await github.createRepo(projectId, project.title);
    await Project.findByIdAndUpdate(projectId, {
      'infra.githubRepoName': repoName,
      'infra.githubRepoUrl':  repoUrl,
    });
    _step(projectId, 'github', 'done', 'GitHub repo נוצר ✓');

    // ── Step 4: Push generated code ───────────────────────────────────────
    _step(projectId, 'push', 'running', 'מעלה קוד ל-GitHub...');
    const generatedFiles = await GeneratedFile.find({ projectId, status: 'validated' }).lean();
    const filesToPush = generatedFiles.length > 0
      ? generatedFiles.map((f) => ({ path: f.filePath, content: f.content }))
      : _placeholderFiles(project.title, repoName);
    await github.pushFiles(fullName, filesToPush);
    _step(projectId, 'push', 'done', 'קוד הועלה ✓');

    // ── Step 5: Deploy on Render ──────────────────────────────────────────
    _step(projectId, 'render', 'running', 'מפרסם באינטרנט...');

    // Collect all env vars from provisioned services
    const extraEnvVars = [
      ...resend.getEnvVars(project.title),
      ...cloudinary.getEnvVars(cloudinaryPreset),
    ];

    const { serviceId, serviceUrl } = await render.deployService(
      projectId, fullName, mongoUri, extraEnvVars,
    );
    await Project.findByIdAndUpdate(projectId, {
      'infra.renderServiceId': serviceId,
      'infra.renderUrl':       serviceUrl,
    });

    await render.waitForDeploy(serviceId, (status) => {
      _step(projectId, 'render', 'running', `Render: ${_renderLabel(status)}`);
    });
    _step(projectId, 'render', 'done', 'האפליקציה חיה! ✓');

    // ── Finalise ──────────────────────────────────────────────────────────
    await Project.findByIdAndUpdate(projectId, {
      status:            'live',
      deployedUrl:       serviceUrl,
      completionPercent: 100,
    });

    _emit(projectId, 'deployment:completed', { url: serviceUrl, githubUrl: repoUrl });
    _emit(projectId, 'celebration:trigger',  {});
    logger.info('deployment-runner: success', { projectId, serviceUrl });

    // Send success email + in-app notification (fire-and-forget)
    const owner = await User.findById(project.ownerId).lean();
    if (owner) {
      if (owner.email) {
        email.sendDeploymentSuccess({
          to:           owner.email,
          userName:     owner.name,
          projectTitle: project.title,
          liveUrl:      serviceUrl,
          githubUrl:    repoUrl,
        }).catch((err) => logger.warn('deployment-runner: success email failed', { projectId, error: err.message }));
      }
      notifSvc.create({
        userId:    project.ownerId,
        projectId: projectId,
        type:      'deployment_success',
        title:     `🎉 ${project.title} — חיה!`,
        message:   `האפליקציה שלך פורסה בהצלחה`,
        url:       serviceUrl,
      }).catch((err) => logger.warn('deployment-runner: success notification failed', { projectId, error: err.message }));
    }

  } catch (err) {
    logger.error('deployment-runner: failed', { projectId, error: err.message });
    await Project.findByIdAndUpdate(projectId, { status: 'failed' });
    _emit(projectId, 'deployment:failed', { error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function _setStatus(projectId, status) {
  await Project.findByIdAndUpdate(projectId, { status });
  _emit(projectId, 'pipeline:status', { status });
}

function _step(projectId, step, status, label) {
  emitToProject(projectId, 'deployment:step', { step, status, label });
}

function _emit(projectId, event, data) {
  emitToProject(projectId, event, data);
}

function _renderLabel(status) {
  const labels = {
    created:             'שירות נוצר',
    build_in_progress:   'בונה...',
    update_in_progress:  'מעדכן...',
    live:                'חי! 🎉',
    failed:              'נכשל',
  };
  return labels[status] || status;
}

function _placeholderFiles(title, repoName) {
  return [
    { path: 'README.md', content: `# ${title}\n\nGenerated by Power Plan ⚡\n` },
    { path: 'package.json', content: JSON.stringify({ name: repoName, version: '1.0.0', scripts: { start: 'node index.js' } }, null, 2) },
    { path: 'index.js', content: `const http = require('http');\nhttp.createServer((_, res) => res.end('${title} — בקרוב!')).listen(process.env.PORT || 3000);\n` },
  ];
}

module.exports = { runDeployment };
