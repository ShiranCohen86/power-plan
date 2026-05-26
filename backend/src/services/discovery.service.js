const { getClientForUser, MAX_TOKENS } = require('./ai/claude.client');
const env = require('../config/env');

const SYSTEM_PROMPT = `You are a product discovery specialist conducting a structured interview with an entrepreneur.
Your job is to ask targeted questions one at a time to deeply understand their app idea.

You will receive the entrepreneur's idea and all previous Q&A pairs.
Based on that, generate the NEXT single question to ask — or indicate that discovery is complete.

Rules:
- Ask exactly ONE question per response
- Questions should be in the same language as the idea (Hebrew or English)
- Cover these key areas across 5-7 questions total:
  1. Core problem and target audience
  2. Daily user profile
  3. Business model (B2C free / subscription / B2B / e-commerce)
  4. Expected scale (users in first 12 months)
  5. Real-time needs (chat, live updates)
  6. Tech stack preference (standard React+Node+MongoDB or other)
  7. Development timeline for MVP
- Do NOT repeat topics already covered in previous answers
- When all critical areas are covered (minimum 5 questions), respond with exactly: DISCOVERY_COMPLETE
- Keep questions concise and conversational

Respond with ONLY the question text (no numbering, no preamble) or "DISCOVERY_COMPLETE".`;

async function streamNextQuestion(res, { idea, title, answers, userPlan, userApiKey }, signal) {
  const { client, model } = getClientForUser(userPlan, userApiKey);

  const answeredCount = answers.length;

  if (answeredCount >= 7) {
    res.write(`data: ${JSON.stringify({ done: true, finished: true })}\n\n`);
    res.end();
    return;
  }

  const userContent = buildUserContent(idea, title, answers);

  const stream = await client.messages.stream({
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  }, { signal });

  let fullText = '';

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      fullText += chunk.delta.text;
      res.write(`data: ${JSON.stringify({ chunk: chunk.delta.text })}\n\n`);
    }
  }

  const trimmed = fullText.trim();

  // Guard: if Claude returned nothing, surface an error rather than an empty state
  if (!trimmed) {
    res.write(`data: ${JSON.stringify({ error: 'No response from AI — please try again' })}\n\n`);
    res.end();
    return;
  }

  const finished = trimmed === 'DISCOVERY_COMPLETE' || answeredCount >= 6;

  res.write(`data: ${JSON.stringify({ done: true, finished })}\n\n`);
  res.end();
}

function buildUserContent(idea, title, answers) {
  const parts = [`Project title: ${title}`, `Idea: ${idea}`];

  if (answers.length > 0) {
    parts.push('\nPrevious Q&A:');
    answers.forEach(({ question, answer }, i) => {
      parts.push(`Q${i + 1}: ${question}`);
      parts.push(`A${i + 1}: ${answer}`);
    });
    parts.push('\nGenerate the next question, or DISCOVERY_COMPLETE if all key areas are covered.');
  } else {
    parts.push('\nGenerate the first discovery question.');
  }

  return parts.join('\n');
}

module.exports = { streamNextQuestion };
