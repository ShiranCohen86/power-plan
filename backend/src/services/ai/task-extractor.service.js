const { getPlatformClient } = require('./claude.client');
const env = require('../../config/env');
const Task   = require('../../models/Task');
const Sprint = require('../../models/Sprint');
const logger = require('../../utils/logger');

const SYSTEM_PROMPT = `You extract structured task data from a software development plan document.

Output ONLY valid JSON — no markdown, no explanation, no code fences. Just the raw JSON object.

Required schema:
{
  "sprints": [
    { "name": "Sprint 1", "index": 1, "focus": "short focus description" }
  ],
  "epics": [
    {
      "title": "Epic name",
      "features": [
        {
          "title": "Feature name",
          "tasks": [
            {
              "title": "Specific task title",
              "type": "frontend|backend|ai|devops|qa|infrastructure",
              "complexity": "xs|s|m|l|xl",
              "priority": "critical|high|medium|low",
              "sprintIndex": 1,
              "estimatedHours": 4
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Extract ALL epics, features, and tasks mentioned in the document
- Every task must have a sprintIndex that matches one of the defined sprints
- complexity: xs=1-2h, s=3-5h, m=6-10h, l=11-20h, xl=20+h
- type: classify each task by its primary technical domain
- priority: derive from context (core features = high, polish = medium, nice-to-have = low)
- If sprint assignments aren't explicit, distribute tasks logically across sprints`;

async function extractTasks(projectId, phaseId, documentContent) {
  const client = getPlatformClient();

  let rawJson;
  try {
    const response = await client.messages.create({
      model:      env.ANTHROPIC_MODEL,
      max_tokens: 4000,
      system:     SYSTEM_PROMPT,
      messages:   [{
        role:    'user',
        content: `Extract tasks from this development plan:\n\n${documentContent.slice(0, 6000)}`,
      }],
    });
    rawJson = response.content[0]?.text?.trim() || '';
  } catch (err) {
    logger.error('task-extractor: Claude call failed', { error: err.message });
    return;
  }

  let parsed;
  try {
    // Strip any accidental markdown fences Claude might add
    const clean = rawJson.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    logger.error('task-extractor: JSON parse failed', { rawJson: rawJson.slice(0, 200), error: err.message });
    return;
  }

  await _saveSprints(projectId, parsed.sprints || []);
  await _saveTasks(projectId, phaseId, parsed.epics || []);

  logger.info('task-extractor: tasks saved', {
    projectId,
    sprints: (parsed.sprints || []).length,
    epics:   (parsed.epics   || []).length,
  });
}

async function _saveSprints(projectId, sprints) {
  for (const s of sprints) {
    await Sprint.findOneAndUpdate(
      { projectId, index: s.index },
      {
        projectId,
        name:  s.name  || `Sprint ${s.index}`,
        index: s.index || 1,
        focus: s.focus || '',
      },
      { upsert: true, new: true },
    );
  }
}

async function _saveTasks(projectId, phaseId, epics) {
  for (const epic of epics) {
    for (const feature of (epic.features || [])) {
      for (const task of (feature.tasks || [])) {
        await Task.create({
          projectId,
          phaseId,
          epicTitle:    epic.title    || 'Uncategorized',
          featureTitle: feature.title || 'General',
          title:        task.title    || 'Task',
          type:         _normalize(task.type,       ['frontend','backend','ai','devops','qa','infrastructure'], 'backend'),
          complexity:   _normalize(task.complexity, ['xs','s','m','l','xl'], 'm'),
          priority:     _normalize(task.priority,   ['critical','high','medium','low'], 'medium'),
          sprintIndex:  task.sprintIndex || null,
          estimatedHours: task.estimatedHours || null,
        });
      }
    }
  }
}

function _normalize(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

module.exports = { extractTasks };
