/**
 * Data migration script — safe to run multiple times (idempotent).
 *
 * Migrations:
 *   M1  Sync project-level Anthropic API keys → global user key
 *       (Sprint 21: projects that already had a key entered via SettingsGate
 *        should now also propagate to the owner's global settings)
 *
 *   M2  Backfill approvalGates: true on projects where the field is missing
 *       (Sprint 17: old docs without the field were auto-approving phases)
 *
 *   M3  Initialise requiredServices: [] on projects that lack the array
 *       (Sprint 18: new dynamic services feature reads this array)
 *
 *   M4  Anomaly report — invalid statuses, orphaned projects (no action taken)
 *
 * Run from the backend directory:
 *   node scripts/migrate.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const env      = require('../src/config/env');

require('../src/models/index'); // register all mongoose models
const Project  = require('../src/models/Project');
const User     = require('../src/models/User');
const { encrypt, decrypt } = require('../src/services/encryption.service');

const VALID_STATUSES = [
  'onboarding', 'planning', 'coding', 'deploying',
  'live', 'failed', 'paused', 'awaiting_credentials', 'quota_paused',
];

function log(msg)  { console.log(`  [migrate] ${msg}`); }
function warn(msg) { console.warn(`  [migrate] WARN  ${msg}`); }
function ok(msg)   { console.log(`  [migrate] ✓  ${msg}`); }

// ─────────────────────────────────────────────────────────────────────────────
// M1 — Sync project API keys → user global key
// ─────────────────────────────────────────────────────────────────────────────
async function m1_syncApiKeys() {
  console.log('\nM1  Sync project Anthropic keys → user global settings');

  const projects = await Project
    .find({ 'settings.anthropicApiKey': { $exists: true, $ne: null, $ne: '' } })
    .select('+settings.anthropicApiKey')
    .lean();

  log(`Found ${projects.length} project(s) with a stored API key`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const project of projects) {
    try {
      const user = await User
        .findById(project.ownerId)
        .select('+settings.anthropicApiKey')
        .lean();

      if (!user) {
        warn(`Project "${project.title}" (${project._id}) has no owner — skipped`);
        errors++;
        continue;
      }

      if (user.settings?.anthropicApiKey) {
        skipped++;
        continue; // user already has a global key, don't overwrite
      }

      const plain = decrypt(project.settings.anthropicApiKey);
      if (!plain) {
        warn(`Could not decrypt key for project "${project.title}" — skipped`);
        errors++;
        continue;
      }

      await User.findByIdAndUpdate(project.ownerId, {
        $set: { 'settings.anthropicApiKey': encrypt(plain) },
      });
      synced++;
      log(`  ${user.email} ← key from project "${project.title}"`);
    } catch (err) {
      warn(`Error processing project "${project.title}": ${err.message}`);
      errors++;
    }
  }

  ok(`Synced: ${synced}  |  Already had key: ${skipped}  |  Errors: ${errors}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// M2 — Backfill approvalGates: true
// ─────────────────────────────────────────────────────────────────────────────
async function m2_approvalGates() {
  console.log('\nM2  Backfill approvalGates: true on old projects');

  const result = await Project.updateMany(
    { approvalGates: { $exists: false } },
    { $set: { approvalGates: true } },
  );

  ok(`Updated ${result.modifiedCount} project(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// M3 — Initialise requiredServices: []
// ─────────────────────────────────────────────────────────────────────────────
async function m3_requiredServices() {
  console.log('\nM3  Initialise requiredServices: [] on old projects');

  const result = await Project.updateMany(
    { requiredServices: { $exists: false } },
    { $set: { requiredServices: [] } },
  );

  ok(`Updated ${result.modifiedCount} project(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// M4 — Anomaly report (read-only)
// ─────────────────────────────────────────────────────────────────────────────
async function m4_anomalyReport() {
  console.log('\nM4  Anomaly report (no changes made)');

  // Unknown status values
  const badStatus = await Project
    .find({ status: { $nin: VALID_STATUSES } })
    .select('title status')
    .lean();

  if (badStatus.length > 0) {
    warn(`${badStatus.length} project(s) with unrecognised status:`);
    badStatus.forEach((p) => warn(`    "${p.title}" → "${p.status}"`));
  }

  // Orphaned projects (owner deleted)
  const allProjects = await Project.find({}).select('title ownerId').lean();
  const ownerIds = [...new Set(allProjects.map((p) => p.ownerId?.toString()).filter(Boolean))];
  const presentUsers = await User.find({ _id: { $in: ownerIds } }).select('_id').lean();
  const presentSet = new Set(presentUsers.map((u) => u._id.toString()));

  const orphaned = allProjects.filter((p) => !presentSet.has(p.ownerId?.toString()));
  if (orphaned.length > 0) {
    warn(`${orphaned.length} orphaned project(s) with no owner:`);
    orphaned.forEach((p) => warn(`    "${p.title}" (id: ${p._id})`));
  }

  // Summary
  const issues = badStatus.length + orphaned.length;
  if (issues === 0) {
    ok('No anomalies found');
  } else {
    warn(`${issues} issue(s) found — review warnings above`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Power Plan — Data Migration ===');
  console.log(`Target: ${env.MONGO_URI}`);

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);

  try {
    await m1_syncApiKeys();
    await m2_approvalGates();
    await m3_requiredServices();
    await m4_anomalyReport();
    console.log('\n=== All migrations completed ===\n');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('\n[migrate] FATAL:', err.message);
  process.exit(1);
});
