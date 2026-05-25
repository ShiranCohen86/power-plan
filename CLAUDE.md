# Power Plan — CLAUDE.md

## Project Overview
AI Software Factory Platform — יזם כותב רעיון, Claude בונה אפליקציה מלאה ומפרסם אותה.

## Stack
- **Backend**: Node.js (CommonJS) + Express + MongoDB + Mongoose + JWT + Joi + Winston
- **Frontend**: React 18 + Vite (ESM) + Redux Toolkit + Axios + SASS + i18next
- **AI**: Anthropic Claude SDK (`claude-sonnet-4-6`, max_tokens: 4000)
- **Real-time**: Socket.io + Redis adapter
- **Storage**: Cloudflare R2 (workspace files)
- **Deployment**: Render (V1), Vercel (V2)

## Roles
- `admin` — platform admin
- `client` — entrepreneur using the platform

## Pipeline Phases
1. Idea Understanding (IdeaAnalystAgent)
2. Product Discovery (ProductDiscoveryAgent)
3. Market Analysis (MarketAnalystAgent)
4. UX Architecture (UXArchitectAgent)
5. Technical Architecture (TechArchitectAgent)
6. System Design (SystemDesignAgent)
7. Database Design (DatabaseAgent)
8. AI Agent System (AIAgentSystemAgent)
9. Orchestration (OrchestrationAgent)
10. Dev Planning (DevPlannerAgent)
11. QA Strategy (QAAgent)
12. DevOps Strategy (DevOpsAgent)
+ 6 Code Generation phases (13-18)

## Meeting System
After each planning phase, virtual team meets (Slack-style):
- Sarah (CTO, purple), David (PM, blue), Alex (UX, yellow)
- Maya (Backend, green), Tom (Frontend, red), Dana (QA, orange)
- Eli (DevOps, gray), Noa (Security, pink)

## Key Services
- `orchestrator.service.js` — coordinator
- `pipeline-queue.service.js` — max 5 concurrent Claude calls
- `planning-runner.service.js` — phases 0-11 + meetings + resume
- `codegen-runner.service.js` — phases 13-18, atomic writes
- `deployment-runner.service.js` — Render/GitHub

## Conventions
- Backend: CommonJS (`require`/`module.exports`)
- Frontend: ESM (`import`/`export`)
- Auth: JWT 15m access + 30d refresh with rotation
- All Markdown rendered with DOMPurify
- Context chaining: 500-char summaries per phase doc
- Atomic file writes: `.tmp` → rename

## Lessons Learned
(populated as development progresses)
