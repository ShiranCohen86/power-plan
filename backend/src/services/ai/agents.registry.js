// Central registry mapping agentName → agent instance
const registry = {
  // Planning phases (0-11)
  IdeaAnalystAgent:      require('./idea-analyst.agent'),
  ProductDiscoveryAgent: require('./product-discovery.agent'),
  MarketAnalystAgent:    require('./market-analyst.agent'),
  UXArchitectAgent:      require('./ux-architect.agent'),
  TechArchitectAgent:    require('./tech-architect.agent'),
  SystemDesignAgent:     require('./system-design.agent'),
  DatabaseAgent:         require('./database.agent'),
  AIAgentSystemAgent:    require('./ai-agent-system.agent'),
  OrchestrationAgent:    require('./orchestration.agent'),
  DevPlannerAgent:       require('./dev-planner.agent'),
  QAAgent:               require('./qa.agent'),
  DevOpsAgent:           require('./devops.agent'),
  // Code generation phases (12-17)
  DatabaseSchemaAgent:   require('./db-schema.agent'),
  BackendScaffoldAgent:  require('./backend-scaffold.agent'),
  FrontendScaffoldAgent: require('./frontend-scaffold.agent'),
  TestsAgent:            require('./tests.agent'),
  ConfigAgent:           require('./config.agent'),
  ReviewAgent:           require('./review.agent'),
};

function getAgent(agentName) {
  const agent = registry[agentName];
  if (!agent) throw new Error(`Unknown agent: ${agentName}`);
  return agent;
}

module.exports = { getAgent };
