const AgentLog = require('../models/AgentLog');
const Lesson   = require('../models/Lesson');
const logger   = require('../utils/logger');

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

const MIN_MISTAKE_LENGTH = 10;
const MAX_MISTAKE_LENGTH = 500;
const MISTAKE_REGEX_CHARS = /[.*+?^${}()|[\]\\]/g;

/**
 * Scans agent error logs for a project and upserts lessons into the knowledge base.
 * Called fire-and-forget after all planning phases complete.
 */
async function autoExtractLessons(projectId) {
  const errorLogs = await AgentLog.find({ projectId, event: 'error' }).lean();
  if (!errorLogs.length) return;

  for (const log of errorLogs) {
    const agentType = AGENT_TO_TYPE[log.agentName];
    if (!agentType) continue;

    const mistake = (log.metadata?.error || log.message || 'Unknown agent error')
      .slice(0, MAX_MISTAKE_LENGTH);
    if (!mistake || mistake.length < MIN_MISTAKE_LENGTH) continue;

    const regexSafe = mistake.slice(0, 60).replace(MISTAKE_REGEX_CHARS, '\\$&');

    await Lesson.findOneAndUpdate(
      { agentType, mistake: { $regex: regexSafe, $options: 'i' } },
      {
        $setOnInsert: {
          category: 'spec_quality',
          mistake,
          lesson:   'ודא שהסוכן מקבל context מלא ושיש מספיק tokens להשלמת המשימה',
          isActive: true,
        },
        $inc: { occurrenceCount: 1 },
        $set: { lastSeenAt: new Date() },
      },
      { upsert: true },
    );
  }

  logger.info('lesson-extractor: extracted lessons', { projectId, count: errorLogs.length });
}

module.exports = { autoExtractLessons };
