const AgentLog  = require('../models/AgentLog');
const Document  = require('../models/Document');
const Phase     = require('../models/Phase');
const Lesson    = require('../models/Lesson');
const logger    = require('../utils/logger');
const { getPlatformClient } = require('./ai/claude.client');
const env = require('../config/env');

const AGENT_TO_TYPE = {
  IdeaAnalystAgent:      'idea_understanding',
  ProductDiscoveryAgent: 'product_discovery',
  MarketAnalystAgent:    'market_analysis',
  UXArchitectAgent:      'ux_architecture',
  TechArchitectAgent:    'tech_architecture',
  SystemDesignAgent:     'system_design',
  DatabaseAgent:         'database_design',
  AIAgentSystemAgent:    'ai_agent_system',
  OrchestrationAgent:    'orchestration',
  DevPlannerAgent:       'dev_planning',
  QAAgent:               'qa_strategy',
  DevOpsAgent:           'devops_strategy',
};

const VALID_CATEGORIES = [
  'spec_quality', 'code_quality', 'architecture', 'security', 'ux', 'planning',
];

const MIN_MISTAKE_LENGTH = 10;
const MAX_MISTAKE_LENGTH = 500;
const MISTAKE_REGEX_CHARS = /[.*+?^${}()|[\]\\]/g;
const DOC_CONTEXT_CHARS   = 400;

async function _generateLesson(agentType, mistake, docContext) {
  const client = getPlatformClient();

  const prompt = `You are a software engineering lessons-learned system. An AI agent failed during a project pipeline.

Agent type: ${agentType}
Error / mistake:
${mistake}
${docContext ? `\nPhase document context (excerpt):\n${docContext}` : ''}

Generate a concise, actionable lesson for this failure. Respond with ONLY valid JSON, no markdown:
{
  "lesson": "<1-2 sentences on what went wrong and how to prevent it next time>",
  "category": "<one of: spec_quality|code_quality|architecture|security|ux|planning>"
}`;

  const response = await client.messages.create({
    model:      env.ANTHROPIC_MODEL_STARTER, // haiku — cheapest, sufficient for this task
    max_tokens: 200,
    messages:   [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0]?.text?.trim() || '';
  try {
    const parsed = JSON.parse(raw);
    const lesson   = (typeof parsed.lesson   === 'string' ? parsed.lesson   : '').slice(0, 500);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'spec_quality';
    return { lesson: lesson || mistake.slice(0, 200), category };
  } catch {
    // Fallback: use the raw text as lesson if JSON parse fails
    return { lesson: raw.slice(0, 500) || mistake.slice(0, 200), category: 'spec_quality' };
  }
}

/**
 * Scans agent error logs for a project and upserts lessons into the knowledge base.
 * v2: uses Claude (Haiku) to generate meaningful lesson text for new entries.
 * Called fire-and-forget after all planning phases complete.
 */
async function autoExtractLessons(projectId) {
  const errorLogs = await AgentLog.find({ projectId, event: 'error' }).lean();
  if (!errorLogs.length) return;

  let created = 0;
  let updated = 0;

  for (const log of errorLogs) {
    const agentType = AGENT_TO_TYPE[log.agentName];
    if (!agentType) continue;

    const mistake = (log.metadata?.error || log.message || 'Unknown agent error')
      .slice(0, MAX_MISTAKE_LENGTH);
    if (!mistake || mistake.length < MIN_MISTAKE_LENGTH) continue;

    const regexSafe = mistake.slice(0, 60).replace(MISTAKE_REGEX_CHARS, '\\$&');

    // Check if this lesson already exists — if so, just increment
    const existing = await Lesson.findOne({
      agentType,
      mistake: { $regex: regexSafe, $options: 'i' },
    });

    if (existing) {
      await Lesson.findByIdAndUpdate(existing._id, {
        $inc: { occurrenceCount: 1 },
        $set: { lastSeenAt: new Date() },
      });
      updated++;
      continue;
    }

    // New lesson — get phase document for context
    let docContext = '';
    try {
      const phase = await Phase.findOne({ projectId, agentName: log.agentName }).lean();
      if (phase) {
        const doc = await Document.findOne({ projectId, phaseId: phase._id }).lean();
        if (doc?.summary) docContext = doc.summary.slice(0, DOC_CONTEXT_CHARS);
        else if (doc?.content) docContext = doc.content.slice(0, DOC_CONTEXT_CHARS);
      }
    } catch (ctxErr) {
      logger.debug('lesson-extractor: could not fetch doc context', { error: ctxErr.message });
    }

    // Generate lesson with Claude
    let generated;
    try {
      generated = await _generateLesson(agentType, mistake, docContext);
    } catch (aiErr) {
      logger.warn('lesson-extractor: Claude generation failed, using fallback', { error: aiErr.message });
      generated = { lesson: mistake.slice(0, 300), category: 'spec_quality' };
    }

    await Lesson.create({
      agentType,
      category:       generated.category,
      mistake,
      lesson:         generated.lesson,
      isActive:       true,
      occurrenceCount: 1,
      lastSeenAt:     new Date(),
    });
    created++;
  }

  logger.info('lesson-extractor: done', { projectId, created, updated });
}

module.exports = { autoExtractLessons };
