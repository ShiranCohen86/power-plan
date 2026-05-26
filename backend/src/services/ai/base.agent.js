const { getClientForUser, MAX_TOKENS } = require('./claude.client');
const Lesson = require('../../models/Lesson');

function _isQuotaError(err) {
  // Anthropic SDK throws APIError with status codes
  const status = err.status || err.statusCode;
  if (status === 429) return 'חריגה ממגבלת קריאות (Rate Limit). נסה שוב בעוד מספר דקות.';
  if (status === 402) return 'אזל קרדיט ה-API. יש לתדלק את חשבון אנתרופיק.';
  if (status === 529) return 'שרתי Claude עמוסים כרגע. נסה שוב בעוד כמה דקות.';
  const msg = err.message || '';
  if (msg.includes('credit') || msg.includes('quota') || msg.includes('balance'))
    return 'אזל קרדיט ה-API. יש לתדלק את חשבון אנתרופיק.';
  return null;
}

class BaseAgent {
  // phaseType matches Lesson.agentType enum (e.g. 'product_discovery')
  constructor(agentName, systemPrompt, { maxTokens, phaseType, docMode } = {}) {
    this.agentName    = agentName;
    this.phaseType    = phaseType || null;
    this.docMode      = docMode || false;
    this.systemPrompt = systemPrompt;
    this.maxTokens    = maxTokens || MAX_TOKENS;
  }

  // userCtx: { plan: 'starter'|'pro', apiKey: string|null }
  async run(userPrompt, { onNarrativeChunk, userCtx = {} } = {}) {
    const { client, model } = getClientForUser(userCtx.plan, userCtx.apiKey);
    const fullSystemPrompt  = await this._buildSystemPrompt();

    try {
      return await this._stream(client, model, fullSystemPrompt, userPrompt, onNarrativeChunk);
    } catch (err) {
      const quotaMsg = _isQuotaError(err);
      if (quotaMsg) {
        const e = new Error(quotaMsg);
        e.code = 'QUOTA_EXHAUSTED';
        throw e;
      }
      throw err;
    }
  }

  async _stream(client, model, systemPrompt, userPrompt, onNarrativeChunk) {
    const stream = await client.messages.stream({
      model,
      max_tokens: this.maxTokens,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    let content      = '';
    let inputTokens  = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      if (chunk.type === 'message_start') {
        inputTokens = chunk.message?.usage?.input_tokens || 0;
      }
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        content += chunk.delta.text;
        if (onNarrativeChunk) onNarrativeChunk(chunk.delta.text);
      }
      if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage?.output_tokens || 0;
      }
    }

    return { content, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
  }

  static DOC_MODE_APPENDIX = `

## PLAIN LANGUAGE RULE
You are writing for a non-technical entrepreneur, not a developer.
For every technical term, tool, or concept, add a brief plain-language explanation in parentheses in the project's language.
Example: "Redis (מסד נתונים מהיר בזיכרון — כמו פתק דביק שהשרת זוכר בין בקשות)"
Example: "CI/CD (מערכת שמעלה קוד לאוויר אוטומטית — ללא צורך בפריסה ידנית)"
Every decision must explain WHY it matters for this specific business, not just what it is.`;

  async _buildSystemPrompt() {
    let prompt = this.systemPrompt;

    if (this.phaseType) {
      try {
        const lessons = await Lesson.find({ agentType: this.phaseType, isActive: true })
          .sort({ occurrenceCount: -1 })
          .limit(10)
          .lean();

        if (lessons.length > 0) {
          const lessonsText = lessons
            .map((l) => `- ${l.lesson} (נלמד מ-${l.occurrenceCount} פרויקטים)`)
            .join('\n');
          prompt += `\n\n## לקחים מפרויקטים קודמים:\n${lessonsText}`;
        }
      } catch {
        // DB unavailable — fall back to base prompt
      }
    }

    if (this.docMode) {
      prompt += BaseAgent.DOC_MODE_APPENDIX;
    }

    return prompt;
  }

  buildProjectContext(project, previousDocs = []) {
    const parts = [
      `# Project: ${project.title}`,
      `\n## Idea\n${project.idea}`,
      `\n## Tech Stack\n${project.stack}`,
    ];

    if (project.discoveryAnswers?.length > 0) {
      parts.push('\n## Discovery Q&A');
      project.discoveryAnswers.forEach(({ question, answer }, i) => {
        parts.push(`**Q${i + 1}:** ${question}\n**A:** ${answer}`);
      });
    }

    if (previousDocs.length > 0) {
      parts.push('\n## Previous Phase Summaries (for context)');
      previousDocs.forEach((doc) => {
        parts.push(`### ${doc.type}\n${doc.summary}`);
      });
    }

    return parts.join('\n\n');
  }

  // For code generation phases — includes selected planning docs + previously generated files
  buildCodegenContext(project, planningDocs = [], previousFiles = []) {
    const parts = [
      `# Project: ${project.title}`,
      `## Idea\n${project.idea}`,
      `## Stack\n${project.stack || 'Node.js + Express + MongoDB + React 18 + Vite'}`,
    ];

    if (project.discoveryAnswers?.length > 0) {
      parts.push('## Discovery Q&A');
      project.discoveryAnswers.forEach(({ question, answer }, i) => {
        parts.push(`**Q${i + 1}:** ${question}\n**A:** ${answer}`);
      });
    }

    if (planningDocs.length > 0) {
      parts.push('## Planning Documents');
      planningDocs.forEach((doc) => {
        parts.push(`### ${doc.type}\n${doc.content}`);
      });
    }

    if (previousFiles.length > 0) {
      parts.push('## Previously Generated Files (maintain consistency with these)');
      previousFiles.forEach((f) => {
        parts.push(`<<<EXISTING: ${f.filePath}>>>\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? '\n// ... (truncated)' : ''}`);
      });
    }

    return parts.join('\n\n');
  }

  summarize(content) {
    return content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/\n{2,}/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 500);
  }
}

module.exports = BaseAgent;
