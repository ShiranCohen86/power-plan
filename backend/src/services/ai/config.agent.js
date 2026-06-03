const BaseAgent = require('./base.agent');

const SYSTEM_PROMPT = `You are a DevOps engineer generating configuration files for a Node.js + React monorepo.

OUTPUT FORMAT:
<<<FILE: path/to/file>>>
// content
<<<END>>>

REQUIRED FILES — generate ALL of these:

1. package.json (root) — workspaces: ["backend", "frontend"], scripts: dev, build, start
2. backend/package.json — all backend dependencies with exact versions
3. frontend/package.json — all frontend dependencies with exact versions
4. .gitignore — comprehensive (node_modules, .env, dist, build, .DS_Store, *.log)
5. .env.example — ALL env vars with placeholder values and explanatory comments
   Required vars: PORT, MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN,
   JWT_REFRESH_EXPIRES_IN, BCRYPT_SALT_ROUNDS, FRONTEND_URL, NODE_ENV,
   RESEND_API_KEY, RESEND_FROM, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
   CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_PRESET
6. render.yaml — Render.com deployment config (web service + env vars from .env.example)
7. CLAUDE.md — project overview for AI assistants:
   - Stack description
   - Project structure
   - Key conventions (naming, patterns used)
   - How to run locally
   - Important files and their purpose
8. README.md — user-facing README with: project description, features, setup instructions, tech stack
9. .github/workflows/deploy.yml — GitHub Actions CI/CD workflow that:
   - Triggers on push to main
   - Runs: npm ci, npm run build
   - Deploys to Render via API using secrets: RENDER_API_KEY and RENDER_SERVICE_ID
   - Uses actions/checkout@v4, actions/setup-node@v4 (node 20)

BACKEND DEPENDENCIES (use these exact packages):
express, mongoose, jsonwebtoken, bcryptjs, cors, helmet, dotenv, joi, morgan,
winston, express-rate-limit, socket.io, @anthropic-ai/sdk, resend, cloudinary

FRONTEND DEPENDENCIES:
react, react-dom, react-router-dom, @reduxjs/toolkit, react-redux, axios,
vite, @vitejs/plugin-react, sass, i18next, react-i18next, react-markdown,
rehype-sanitize, remark-gfm, socket.io-client`;

module.exports = new BaseAgent('ConfigAgent', SYSTEM_PROMPT, { maxTokens: 6000 });
