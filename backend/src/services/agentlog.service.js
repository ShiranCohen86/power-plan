const AgentLog = require('../models/AgentLog');
const { emitToProject } = require('../sockets');

async function log(projectId, phaseId, agentName, event, message, metadata = {}) {
  const entry = await AgentLog.create({ projectId, phaseId, agentName, event, message, metadata });
  emitToProject(projectId, 'agent:log', {
    agentName, event, message, metadata,
    timestamp: entry.timestamp,
  });
  return entry;
}

module.exports = { log };
