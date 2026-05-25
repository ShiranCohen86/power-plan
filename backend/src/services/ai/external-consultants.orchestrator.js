/**
 * External Consultants — Round 1: Spec Review
 *
 * Three independent experts review all 12 planning documents
 * from their unique vantage point. Runs after all planning phases
 * complete, before code generation begins.
 */

const { getPlatformClient } = require('./claude.client');
const Document               = require('../../models/Document');
const Meeting                = require('../../models/Meeting');
const MeetingMessage         = require('../../models/MeetingMessage');
const { emitToProject }      = require('../../sockets');
const logger                 = require('../../utils/logger');

const MODEL      = 'claude-sonnet-4-6';
const MAX_TOKENS = 1200;

// ── Consultant definitions ────────────────────────────────────────────────────

const CONSULTANTS = [
  {
    id:    'nir',
    name:  'Nir',
    role:  'משתמש פוטנציאלי',
    emoji: '👤',
    color: '#38bdf8',
    systemPrompt: `You are Nir, a potential user who represents the target audience of this app.
You are NOT technical — you think like a regular person who will use this app daily.
You have just read the full product spec and planning documents.

Your job: identify 3-5 specific concerns from a real user's perspective.

Focus on:
- Is the onboarding flow clear for a non-technical user?
- Are the main flows intuitive? What will confuse users?
- Are there missing features that users will expect?
- Are error messages and empty states defined?
- How long before a new user sees value?

Format your response EXACTLY as a series of blocks:
[Nir]
type: concern|observation|correction
Your message here — 2-3 sentences, specific and honest. Reference specific parts of the spec.

[Nir]
type: ...
...

[Decision]
One sentence summarizing the top UX improvement to apply.

RULES:
- Be specific — reference actual content from the documents
- Speak as a real user, not a product manager
- Use the same language as the planning documents (Hebrew if Hebrew, English if English)
- Find real issues, not generic praise`,
  },
  {
    id:    'oren',
    name:  'Oren',
    role:  'יועץ אבטחה',
    emoji: '🔒',
    color: '#f87171',
    systemPrompt: `You are Oren, an independent security consultant with 15 years of experience.
You specialize in OWASP, API security, authentication, and data privacy.
You have just reviewed the full product spec and architecture documents.

Your job: identify 3-5 security gaps or risks in the specification.

Focus on:
- Is authentication and authorization properly defined?
- Is sensitive data encrypted at rest and in transit?
- Is rate limiting specified?
- Are GDPR / privacy requirements addressed (what data is collected, retention policy)?
- Are there SQL/NoSQL injection vectors?
- Is there a password policy defined?
- Are API keys and secrets handled properly?

Format your response EXACTLY as a series of blocks:
[Oren]
type: concern|observation|correction
Your message here — 2-3 sentences. Reference specific sections.

[Oren]
type: ...
...

[Decision]
One sentence summarizing the most critical security fix to apply.

RULES:
- Be specific — reference actual content from the documents
- Prioritize real risks over theoretical ones
- Use the same language as the planning documents`,
  },
  {
    id:    'mia',
    name:  'Mia',
    role:  'יועץ תוכנה',
    emoji: '💻',
    color: '#a78bfa',
    systemPrompt: `You are Mia, a Senior Software Architect with 20 years of experience in SaaS products.
You review systems for technical correctness, scalability, and pragmatic engineering decisions.
You have just reviewed the full planning and architecture documents.

Your job: identify 3-5 architectural or technical issues in the specification.

Focus on:
- Does the chosen tech stack match the scale defined in Non-Functional Requirements?
- Are there over-engineering or under-engineering decisions?
- Is the API design consistent?
- Are database indexes and data models appropriate for the expected load?
- What will break first when user count grows 10x?
- Is the CI/CD pipeline realistic for the team size?
- Are there missing technical requirements?

Format your response EXACTLY as a series of blocks:
[Mia]
type: concern|observation|correction
Your message here — 2-3 sentences. Be specific and technical.

[Mia]
type: ...
...

[Decision]
One sentence summarizing the most important architectural fix to apply.

RULES:
- Be specific — reference actual numbers, components, or decisions from the documents
- Use the same language as the planning documents
- Focus on what matters most, not perfection`,
  },
];

// ── Main orchestrator ─────────────────────────────────────────────────────────

async function runExternalConsultants(projectId) {
  logger.info('external-consultants: starting spec review', { projectId });

  // Load all approved planning documents as context
  const docs = await Document.find({ projectId, isApproved: true })
    .sort({ createdAt: 1 })
    .lean();

  if (docs.length === 0) {
    logger.warn('external-consultants: no approved documents found', { projectId });
    return;
  }

  // Build a condensed context from all docs (cap each at 800 chars for token safety)
  const docsContext = docs.map((d) => {
    const snippet = d.content.slice(0, 800) + (d.content.length > 800 ? '\n...' : '');
    return `### ${d.type}\n${snippet}`;
  }).join('\n\n');

  const fullContext = `# Project Planning Documents\n\n${docsContext}`;

  // Create a meeting record to persist messages
  const meeting = await Meeting.create({
    projectId,
    type:         'external_review',
    participants: CONSULTANTS.map((c) => c.id),
    status:       'running',
    startedAt:    new Date(),
  });

  emitToProject(projectId, 'consultants:started', {
    meetingId:   meeting._id,
    round:       'spec_review',
    consultants: CONSULTANTS.map((c) => ({ id: c.id, name: c.name, role: c.role, color: c.color, emoji: c.emoji })),
  });

  const client = getPlatformClient();
  let totalImprovements = 0;

  for (const consultant of CONSULTANTS) {
    try {
      const response = await client.messages.create({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     consultant.systemPrompt,
        messages:   [{ role: 'user', content: `Review the following planning documents and provide your findings:\n\n${fullContext}` }],
      });

      const rawText = response.content[0]?.text || '';
      const parsed  = _parseConsultantOutput(rawText, consultant);

      for (const msg of parsed.messages) {
        await MeetingMessage.create({
          meetingId:   meeting._id,
          projectId,
          role:        consultant.id,
          displayName: consultant.name,
          color:       consultant.color,
          message:     msg.message,
          type:        msg.type,
        });

        emitToProject(projectId, 'consultants:message', {
          consultantId: consultant.id,
          name:         consultant.name,
          role:         consultant.role,
          emoji:        consultant.emoji,
          color:        consultant.color,
          message:      msg.message,
          type:         msg.type,
        });

        await _sleep(500); // Live-chat feel
      }

      if (parsed.decision) {
        await MeetingMessage.create({
          meetingId:   meeting._id,
          projectId,
          role:        consultant.id,
          displayName: `${consultant.name} — סיכום`,
          color:       consultant.color,
          message:     parsed.decision,
          type:        'decision',
        });

        emitToProject(projectId, 'consultants:message', {
          consultantId: consultant.id,
          name:         `${consultant.name} — סיכום`,
          role:         consultant.role,
          emoji:        '✅',
          color:        consultant.color,
          message:      parsed.decision,
          type:         'decision',
        });

        await _sleep(300);
      }

      totalImprovements += parsed.messages.filter((m) => m.type !== 'approval').length;

    } catch (err) {
      logger.warn('external-consultants: consultant failed (non-fatal)', {
        projectId, consultant: consultant.id, error: err.message,
      });
      // Continue with next consultant even if one fails
    }
  }

  await Meeting.findByIdAndUpdate(meeting._id, {
    status:            'completed',
    completedAt:       new Date(),
    improvementsCount: totalImprovements,
  });

  emitToProject(projectId, 'consultants:completed', {
    meetingId:         meeting._id,
    improvementsCount: totalImprovements,
  });

  logger.info('external-consultants: spec review complete', { projectId, totalImprovements });
}

// ── Parser ────────────────────────────────────────────────────────────────────

function _parseConsultantOutput(text, consultant) {
  const messages  = [];
  const escapedName = consultant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blocks    = text.split(new RegExp(`\\[${escapedName}\\]`, 'i')).filter(Boolean);

  // Extract decision first
  let decision = null;
  const decisionMatch = text.match(/\[Decision\]([\s\S]*?)(?=\[|$)/i);
  if (decisionMatch) {
    decision = decisionMatch[1].trim();
  }

  for (const block of blocks) {
    // Skip the decision section
    if (/\[Decision\]/i.test(block)) break;

    const typeMatch = block.match(/^[\s\n]*type:\s*(\w+)/i);
    const msgType   = typeMatch ? typeMatch[1].toLowerCase() : 'observation';
    const message   = block.replace(/^[\s\n]*type:\s*\w+\n?/i, '').split(/\[/)[0].trim();

    if (message && message.length > 20) {
      messages.push({
        type:    ['observation', 'correction', 'concern', 'approval'].includes(msgType) ? msgType : 'observation',
        message,
      });
    }
  }

  // Fallback: if parsing failed, create one message from the full text
  if (messages.length === 0 && text.length > 50) {
    messages.push({
      type:    'observation',
      message: text.replace(/\[.*?\]/g, '').trim().slice(0, 400),
    });
  }

  return { messages, decision };
}

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { runExternalConsultants };
