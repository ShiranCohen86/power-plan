# Power Plan — CLAUDE.md

> Instructions for Claude AI. Read this before writing any code.

---

## 1. Project Overview

AI Software Factory: an entrepreneur describes an idea → Claude plans, builds, and deploys a full-stack application. Flow: idea → discovery chat → 12 AI planning agents → 6 code-generation agents → automatic deployment to Render + GitHub. Each planning phase is followed by a virtual team meeting (Slack-style). Roles: `admin` (platform operator) and `client` (entrepreneur).

---

## 2. Stack

| Layer | Tech | Rule |
|-------|------|------|
| Backend | Node.js + Express | **CommonJS only** (`require`/`module.exports`) |
| Frontend | React 18 + Vite | **ESM only** (`import`/`export`) |
| State | Redux Toolkit + react-redux | Async thunks, selectors |
| AI | `@anthropic-ai/sdk` `claude-sonnet-4-6` | max_tokens: 4000 |
| DB | MongoDB + Mongoose | Atlas in prod |
| Real-time | Socket.io + `@socket.io/redis-adapter` | Redis optional in dev |
| Auth | JWT 15m access + 30d refresh + Google OAuth + WebAuthn | Tokens in memory only |
| Storage | Cloudflare R2 | Workspace files |
| Email | Resend | |
| Deployment | Render (backend) + Vercel (frontend) | `render.yaml` present |
| Encryption | AES-256-GCM — `encryption.service.js` | For stored API keys |
| Styling | SASS + MUI | Use mixins, never raw `@media` |
| Logging | Winston (backend) / `src/api/logger.js` (frontend) | Never `console.log` |
| Validation | Joi via `validate` middleware | Backend only |

---

## 3. Architecture

```
HTTP Request
  → routes (auth / projects / pipeline / phases / …)
  → validate middleware (Joi)
  → controller
  → service
  → DB (Mongoose) / AI (Claude SDK)

Pipeline flow:
  orchestrator.service.js
    → pipeline-queue.service.js   (max 5 concurrent Claude calls)
    → planning-runner.service.js  (phases 0–11 + meetings + resume)
    → codegen-runner.service.js   (phases 13–18, atomic .tmp→rename writes)
    → deployment-runner.service.js (Render + GitHub)

After each planning phase (0–11):
  meeting-runner.service.js fires virtual team meeting (8 members)

Context chaining: 500-char summary passed between phases
Atomic writes: always .tmp → rename, never partial writes
```

---

## 4. File Map — Backend

### Entry & Config
| File | Role |
|------|------|
| `server.js` | HTTP server startup; recovers orphaned phases on boot |
| `src/app.js` | Express setup, CORS, middleware stack, route mounting |
| `src/config/env.js` | **Source of truth** for all env vars with defaults |
| `src/config/constants.js` | Phase count, auth limits, rate-limit values, pagination |
| `src/config/db.js` | Mongoose connection |
| `src/config/serviceRegistry.js` | External service registry |

### Core Pipeline ⚠️
| File | Role |
|------|------|
| `src/services/orchestrator.service.js` | **FRAGILE** — coordinates all pipeline phases |
| `src/services/pipeline-queue.service.js` | Concurrency limiter, max 5 Claude calls |
| `src/services/planning-runner.service.js` | Phases 0–11 + meeting triggers + resume logic |
| `src/services/codegen-runner.service.js` | Phases 13–18, atomic file writes |
| `src/services/deployment-runner.service.js` | Render + GitHub deployment |
| `src/services/phase-notifier.service.js` | Emits Socket.io events per phase |

### AI Agents (`src/services/ai/`)
| File | Phase |
|------|-------|
| `base.agent.js` | Base class all agents extend |
| `claude.client.js` | Anthropic SDK wrapper, retries/timeouts |
| `meeting-runner.service.js` | Virtual team meeting orchestration |
| `idea-analyst.agent.js` | 0 |
| `product-discovery.agent.js` | 1 |
| `market-analyst.agent.js` | 2 |
| `ux-architect.agent.js` | 3 |
| `tech-architect.agent.js` | 4 |
| `system-design.agent.js` | 5 |
| `database.agent.js` | 6 |
| `ai-agent-system.agent.js` | 7 |
| `orchestration.agent.js` | 8 |
| `dev-planner.agent.js` | 9 |
| `qa.agent.js` | 10 |
| `devops.agent.js` | 11 |
| `backend-scaffold.agent.js` | 13 |
| `frontend-scaffold.agent.js` | 14 |
| `db-schema.agent.js` | 15 |
| `config.agent.js` | 16 |
| `tests.agent.js` | 17 |
| `review.agent.js` | 18 |
| `agents.registry.js` | Maps phase index → agent class |

### Auth & Security ⚠️
| File | Role |
|------|------|
| `src/services/auth.service.js` | **FRAGILE** — JWT, Google OAuth, WebAuthn, sessions |
| `src/middleware/auth.js` | **FRAGILE** — token verification, attaches `req.user` |
| `src/middleware/rbac.js` | Role checks (`admin`/`client`) |
| `src/middleware/validate.js` | Joi schema validation |
| `src/middleware/error.js` | Global error handler — returns `{error, stack}` in dev |
| `src/services/encryption.service.js` | AES-256-GCM encrypt/decrypt for stored API keys |

### Models (`src/models/`)
| File | Note |
|------|------|
| `User.js` | `sessions[]`, `webAuthnCredentials[]`, `authMethods[]`; encrypted fields have `select:false` |
| `Project.js` | `status` enum, `infra{}`, `settings{}` (encrypted, `select:false`), `requiredServices[]` |
| `Phase.js`, `Document.js`, `AgentLog.js` | Pipeline execution records |
| `Meeting.js`, `MeetingMessage.js` | Virtual team meetings |
| `Task.js`, `Sprint.js`, `GeneratedFile.js` | Dev planning artifacts |
| `Notification.js`, `Lesson.js`, `AuditLog.js` | Platform records |

### Routes (all under `/api`)
```
/auth/*                              → auth.routes.js
/projects/*                          → projects.routes.js
/projects/:projectId/pipeline/*      → pipeline.routes.js
/projects/:projectId/phases/*        → phases.routes.js
/projects/:projectId/agents/*        → agents.routes.js
/projects/:projectId/tasks/*         → tasks.routes.js
/projects/:projectId/sprints/*       → sprints.routes.js
/notifications/*                     → notifications.routes.js
/settings/*                          → settings.routes.js
/admin/*                             → admin.routes.js
```

### Utilities
| File | Role |
|------|------|
| `src/utils/ApiError.js` | `ApiError.badRequest()` / `.unauthorized()` / `.notFound()` / `.conflict()` |
| `src/utils/asyncHandler.js` | Wraps async controllers, forwards errors to `next()` |
| `src/utils/logger.js` | Winston instance (`info`/`warn`/`error`/`debug`) |
| `src/utils/pagination.js` | Cursor pagination helper |

---

## 5. File Map — Frontend

### Core
| File | Role |
|------|------|
| `src/main.jsx` | App bootstrap, Redux store injection into Axios |
| `src/App.jsx` | Routing, layout, protected routes |
| `src/api/request.js` | Axios instance + JWT interceptor + auto-refresh on 401 |
| `src/store/index.js` | Redux store setup |

### Pages (`src/pages/`)
| File | Role |
|------|------|
| `Home.jsx` | Landing (unauthenticated); nav: sign-in (ghost) + "start" (primary → register) |
| `Login.jsx` | Sign-up/login form, Google OAuth, WebAuthn, biometric enrollment |
| `Dashboard.jsx` | Project list, sort/filter, empty state |
| `NewProject.jsx` | Idea input + discovery chat |
| `ProjectWorkspace.jsx` | Pipeline workspace: phase list, live feed, meetings |
| `TaskManagement.jsx` | Task/sprint kanban board |
| `Settings.jsx` | User prefs, API key, biometric (mobile-only) |
| `Admin.jsx` | Platform admin: lessons, analytics |
| `Status.jsx`, `NotFound.jsx` | Status page, 404 |

### Key Components
| File | Role |
|------|------|
| `AppShell.jsx` | **FRAGILE** — top bar, mobile/desktop layout, search, notifications |
| `workspace/LiveFeed.jsx` | Real-time event stream |
| `workspace/PhaseList.jsx` | Phase timeline with approval controls |
| `workspace/MeetingRoomOverlay.jsx` | Virtual team meeting UI |
| `workspace/CredentialsGateModal.jsx` | Collects user API keys for provisioning |
| `auth/BiometricButton.jsx` | Mobile-only — guarded by `navigator.maxTouchPoints === 0` |
| `ui/SafeMarkdown.jsx` | DOMPurify + react-markdown — **always use for AI content** |

### Store Slices (`src/store/slices/`)
| File | State |
|------|-------|
| `authSlice.js` | `user`, `accessToken` (**memory only, never localStorage**), `status` |
| `projectsSlice.js` | Projects list, pagination, search, sort |
| `phasesSlice.js` | Phases array, currentPhase, loading states |
| `tasksSlice.js`, `sprintsSlice.js` | Task/sprint state |
| `notificationsSlice.js`, `uiSlice.js` | Notifications, UI state |

### Hooks (`src/hooks/`)
| File | Role |
|------|------|
| `useProjectSocket.js` | Connects Socket.io, listens to project events |
| `useWorkspaceSocket.js` | Workspace-level socket events |
| `useWorkspaceState.js` | Aggregates workspace UI state |
| `usePhaseActions.js` | approve / refine / rollback actions |

### Styles (`src/styles/`)
| File | Role |
|------|------|
| `_variables.scss` | All CSS custom properties and Sass variables |
| `_mixins.scss` | **⚠️ Breakpoint mixins** — use these, never raw `@media` |
| `_utilities.scss` | **FRAGILE** — global responsive overrides, touch targets, workspace layout |
| `_*.scss` (others) | Component-scoped; only edit when that component is the target |

---

## 6. Coding Conventions

### Module system
```js
// Backend — CommonJS ONLY
const X = require('./x');
module.exports = { fn };

// Frontend — ESM ONLY
import X from './x';
export default fn;
```

### Error handling (backend)
```js
// Always throw ApiError — never throw raw Error from services
throw ApiError.badRequest('message');    // 400
throw ApiError.unauthorized('message'); // 401
throw ApiError.notFound('message');     // 404
throw ApiError.conflict('message');     // 409

// Controllers must be wrapped
exports.myAction = asyncHandler(async (req, res) => { … });
```

### SCSS — never raw `@media`
```scss
// ✅ correct — always use mixins
@include mobile      { … }  // ≤767px
@include tablet      { … }  // 768–1279px
@include desktop     { … }  // ≥1280px
@include not-desktop { … }  // ≤1279px (tablet + mobile)
@include small-phone { … }  // ≤480px
@include xsmall-phone { … } // ≤375px

// ❌ wrong
@media (max-width: 767px) { … }
```

### Redux async thunk
```js
export const fetchX = createAsyncThunk('slice/fetchX', async (arg, { rejectWithValue }) => {
  try   { return await api.getX(arg); }
  catch (err) { return rejectWithValue(err.message); }
});
```

### Mongoose — sensitive fields need explicit select
```js
// Fields with select:false must be explicitly requested
User.findById(id).select('+webAuthnChallenge +passwordHash')
```

### Logging — never `console.log`
```js
// Backend
const logger = require('../utils/logger');
logger.info('message', { context });

// Frontend
import { logInfo, logError } from '../api/logger.js';
logInfo('module', 'message', data);
```

### RTL — use logical CSS properties
```scss
// ✅ RTL-safe
margin-inline-start: 12px;
padding-inline: 16px;

// ❌ breaks in Hebrew RTL
margin-left: 12px;
```

---

## 7. Before You Write Code — Mandatory Checklist

1. **Read the file first** — never assume structure; always read the relevant service/component
2. **Search before implementing** — Grep for the function/pattern; it may already exist
3. **Fragile area?** — If touching orchestrator, auth middleware, SCSS globals, or pipeline runners: re-read the entire file
4. **Both viewports** — any UI change must work on mobile AND desktop
5. **RTL** — Hebrew is the default language; use logical CSS properties
6. **Biometric guard** — all biometric UI must be gated with `navigator.maxTouchPoints > 0`
7. **Verify in browser** — do not report a frontend change complete without observing it visually
8. **AI content** — always use `<SafeMarkdown>` — never `dangerouslySetInnerHTML`

---

## 8. Fragile Areas

| Area | Why |
|------|-----|
| `orchestrator.service.js` | Coordinates all phases; one wrong change breaks all pipelines |
| `planning-runner.service.js` | Phase sequencing, meeting triggers, resume logic |
| `codegen-runner.service.js` | Atomic writes — partial writes corrupt generated files |
| `auth.service.js` | JWT rotation, WebAuthn flow, session management |
| `src/middleware/auth.js` | Attaches `req.user` — any bug breaks all protected routes |
| `src/sockets/index.js` | Duplicate event emitters cause duplicated UI updates |
| `_utilities.scss` | Global responsive rules — a misplaced rule breaks all pages |
| `_mixins.scss` | Breakpoint source of truth — changing values breaks all components |
| `authSlice.js` | Access token in Redux memory — must never touch `localStorage` |

---

## 9. Pipeline Phases

| Phase | Agent file | Meeting? |
|-------|-----------|----------|
| 0 | `idea-analyst.agent.js` | ✅ |
| 1 | `product-discovery.agent.js` | ✅ |
| 2 | `market-analyst.agent.js` | ✅ |
| 3 | `ux-architect.agent.js` | ✅ |
| 4 | `tech-architect.agent.js` | ✅ |
| 5 | `system-design.agent.js` | ✅ |
| 6 | `database.agent.js` | ✅ |
| 7 | `ai-agent-system.agent.js` | ✅ |
| 8 | `orchestration.agent.js` | ✅ |
| 9 | `dev-planner.agent.js` | ✅ |
| 10 | `qa.agent.js` | ✅ |
| 11 | `devops.agent.js` | ✅ |
| 13 | `backend-scaffold.agent.js` | — |
| 14 | `frontend-scaffold.agent.js` | — |
| 15 | `db-schema.agent.js` | — |
| 16 | `config.agent.js` | — |
| 17 | `tests.agent.js` | — |
| 18 | `review.agent.js` | — |

Meeting members: Sarah (CTO, purple), David (PM, blue), Alex (UX, yellow), Maya (Backend, green), Tom (Frontend, red), Dana (QA, orange), Eli (DevOps, gray), Noa (Security, pink).

---

## 10. Environment Variables

Full list with defaults: `backend/src/config/env.js` (source of truth).

**Required in production:**
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — token signing
- `ANTHROPIC_API_KEY` — Claude API
- `ENCRYPTION_KEY` — 64 hex chars (32 bytes) for AES-256-GCM
- `FRONTEND_URL` — CORS allowed origin

**Optional services:**
- `REDIS_URL` — Socket.io pub/sub for multi-instance deployments
- `RENDER_API_KEY` + `RENDER_OWNER_ID` — deployment provisioning
- `ATLAS_PUBLIC_KEY`, `ATLAS_PRIVATE_KEY`, `ATLAS_PROJECT_ID`, `ATLAS_CLUSTER_NAME` — MongoDB Atlas provisioning
- `GITHUB_TOKEN`, `GITHUB_ORG` — GitHub repo provisioning
- `RESEND_API_KEY`, `RESEND_FROM` — transactional email
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — media hosting
- `CF_R2_ACCOUNT_ID`, `CF_R2_ACCESS_KEY_ID`, `CF_R2_SECRET_ACCESS_KEY`, `CF_R2_BUCKET_NAME` — file storage
- `SENTRY_DSN` — error monitoring
- `WEBAUTHN_RP_ID` — passkey domain (`localhost` in dev, real domain in prod)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth

**Dev only:**
- `RETURN_DEV_TOKEN=true` — returns password reset token in API response (never set in prod)

---

## 11. Regression Traps

1. **Auth/JWT after any auth change** — test full flow: login → access protected route → token refresh → logout. A broken `auth.js` middleware breaks every route.

2. **SCSS mobile/desktop bleed** — a rule written outside a mixin applies to all viewports. Always scope with `@include mobile` / `@include desktop`. Symptom: desktop layout breaks on mobile or vice versa.

3. **Socket.io duplicate events** — adding a listener inside a React component without cleanup causes it to fire twice on re-render. Always `return () => socket.off('event')` from `useEffect`.

4. **Redux stale state after backend shape change** — if you change a backend response field name, update the Redux slice reducer AND all selectors that read that field.

5. **Biometric on desktop** — `navigator.maxTouchPoints === 0` on desktop. All biometric UI must be gated. Missing this check shows fingerprint UI on Windows/Mac.

6. **Raw `@media` instead of mixins** — breakpoints: `mobile ≤767px`, `tablet 768–1279px`, `desktop ≥1280px`. Using a raw pixel value creates inconsistency. Always use `_mixins.scss`.

7. **ENCRYPTION_KEY rotation** — `encryption.service.js` supports v1/v2 keys. Never replace `ENCRYPTION_KEY` without first setting `ENCRYPTION_KEY_V2` to the old value — old encrypted data will fail to decrypt silently (returns `null`).

8. **Orphaned pipeline recovery** — `server.js` recovers stuck phases on boot. Don't add startup code that interferes with this recovery flow.

9. **`select:false` silent failures** — fields like `passwordHash`, `webAuthnChallenge`, `settings.anthropicApiKey` are hidden by default. Forgetting `.select('+field')` returns `undefined` without throwing — a silent bug.
