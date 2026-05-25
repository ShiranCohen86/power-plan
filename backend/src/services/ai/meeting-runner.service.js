const { getClient, MODEL, MAX_TOKENS } = require('./claude.client');
const Meeting        = require('../../models/Meeting');
const MeetingMessage = require('../../models/MeetingMessage');
const { emitToProject } = require('../../sockets');

const TEAM = {
  cto:      { name: 'Sarah', role: 'CTO',             color: '#7c3aed', focus: 'architecture, scalability, technical feasibility, and cost implications' },
  pm:       { name: 'David', role: 'Product Manager',  color: '#2563eb', focus: 'user value, feature priorities, KPIs, and business model alignment' },
  ux:       { name: 'Alex',  role: 'UX Designer',     color: '#ca8a04', focus: 'user experience, flows, accessibility, mobile, and empty states' },
  backend:  { name: 'Maya',  role: 'Backend Dev',     color: '#16a34a', focus: 'API design feasibility, data model correctness, and performance' },
  frontend: { name: 'Tom',   role: 'Frontend Dev',    color: '#dc2626', focus: 'component complexity, UX implementation, and state management' },
  qa:       { name: 'Dana',  role: 'QA Engineer',     color: '#ea580c', focus: 'edge cases, testability, error handling, and test coverage' },
  devops:   { name: 'Eli',   role: 'DevOps',          color: '#4b5563', focus: 'deployment, CI/CD, monitoring, and infrastructure' },
  security: { name: 'Noa',   role: 'Security',        color: '#db2777', focus: 'authentication, authorization, vulnerabilities, privacy, and OWASP' },
};

const MEETING_PARTICIPANTS = {
  idea_understanding:  ['pm', 'cto'],
  product_discovery:   ['pm', 'cto', 'ux'],
  market_analysis:     ['pm', 'cto'],
  ux_architecture:     ['ux', 'pm', 'frontend'],
  tech_architecture:   ['cto', 'backend', 'frontend'],
  system_design:       ['cto', 'backend', 'devops'],
  database_design:     ['cto', 'backend'],
  ai_agent_system:     ['cto', 'pm'],
  orchestration:       ['cto', 'devops'],
  dev_planning:        ['pm', 'backend', 'frontend', 'qa'],
  qa_strategy:         ['qa', 'pm', 'cto'],
  devops_strategy:     ['devops', 'cto', 'security'],
};

async function runMeeting(projectId, phaseId, phaseType, documentContent) {
  const participantKeys = MEETING_PARTICIPANTS[phaseType] || ['pm', 'cto'];
  const participants    = participantKeys.map((k) => TEAM[k]);

  const meeting = await Meeting.create({
    projectId,
    phaseId,
    type:         phaseType,
    participants: participantKeys,
    status:       'running',
    startedAt:    new Date(),
  });

  emitToProject(projectId, 'meeting:started', {
    meetingId:    meeting._id,
    phaseType,
    participants: participants.map((p) => ({ name: p.name, role: p.role, color: p.color })),
  });

  const participantDescriptions = participants
    .map((p) => `- ${p.name} (${p.role}): focuses on ${p.focus}`)
    .join('\n');

  const systemPrompt = `You are facilitating a team review meeting. Simulate each team member reviewing the document from their professional perspective.

Participants:
${participantDescriptions}

Format your response EXACTLY as shown (one block per participant, then one Decision block):

[ParticipantName]
type: observation|correction|concern|approval
Your message here — 2-4 sentences, specific and actionable. Reference specific parts of the document.

[ParticipantName]
type: ...
...

[Decision]
1-2 sentences summarizing the key improvements identified and what will be updated.

RULES:
- Each participant must find at least one specific issue or improvement opportunity
- Reference concrete details from the document (not generic feedback)
- Use the same language as the document
- The Decision must summarize actual changes that will be applied`;

  const userPrompt = `Review this planning document:\n\n${documentContent.slice(0, 3000)}`;

  const client   = getClient();
  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: 1500,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  });

  const rawText    = response.content[0]?.text || '';
  const parsed     = parseMeetingOutput(rawText, participants);
  const savedMsgs  = [];

  for (const msg of parsed.messages) {
    const saved = await MeetingMessage.create({
      meetingId:   meeting._id,
      projectId,
      role:        msg.role,
      displayName: msg.displayName,
      color:       msg.color,
      message:     msg.message,
      type:        msg.type,
    });
    savedMsgs.push(saved);
    emitToProject(projectId, 'meeting:message', {
      meetingId:   meeting._id,
      role:        msg.role,
      displayName: msg.displayName,
      color:       msg.color,
      message:     msg.message,
      type:        msg.type,
    });
    // Stagger messages for live-chat feel
    await sleep(400);
  }

  if (parsed.decision) {
    const decisionMsg = await MeetingMessage.create({
      meetingId:   meeting._id,
      projectId,
      role:        'facilitator',
      displayName: 'Decision',
      color:       '#22c55e',
      message:     parsed.decision,
      type:        'decision',
    });
    emitToProject(projectId, 'meeting:message', {
      meetingId:   meeting._id,
      role:        'facilitator',
      displayName: 'Decision',
      color:       '#22c55e',
      message:     parsed.decision,
      type:        'decision',
    });
  }

  const improvements = parsed.messages.filter((m) => m.type !== 'approval').length;
  await Meeting.findByIdAndUpdate(meeting._id, {
    status:            'completed',
    completedAt:       new Date(),
    improvementsCount: improvements,
  });

  emitToProject(projectId, 'meeting:completed', {
    meetingId:         meeting._id,
    improvementsCount: improvements,
    updatedSummary:    parsed.decision || '',
  });

  return { meeting, improvements };
}

function parseMeetingOutput(text, participants) {
  const messages  = [];
  const nameToKey = {};
  participants.forEach((p) => { nameToKey[p.name.toLowerCase()] = p; });

  const blocks = text.split(/\[([^\]]+)\]/g).filter(Boolean);

  let i = 0;
  while (i < blocks.length) {
    const header = blocks[i].trim();
    const body   = blocks[i + 1] || '';

    if (header.toLowerCase() === 'decision') {
      return { messages, decision: body.trim() };
    }

    const participant = Object.values(TEAM).find(
      (p) => p.name.toLowerCase() === header.toLowerCase(),
    );

    if (participant) {
      const typeMatch = body.match(/^type:\s*(\w+)/i);
      const msgType   = typeMatch ? typeMatch[1].toLowerCase() : 'observation';
      const message   = body.replace(/^type:\s*\w+\n?/i, '').trim();

      if (message) {
        messages.push({
          role:        Object.keys(TEAM).find((k) => TEAM[k].name === participant.name),
          displayName: participant.name,
          color:       participant.color,
          message,
          type:        ['observation', 'correction', 'approval', 'concern', 'decision'].includes(msgType)
            ? msgType : 'observation',
        });
      }
    }

    i += 2;
  }

  return { messages, decision: null };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { runMeeting };
