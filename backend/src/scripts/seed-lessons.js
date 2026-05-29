/**
 * seed-lessons.js — Pre-seed the Lessons collection with React/Node best practices.
 *
 * These lessons are injected by BaseAgent._buildSystemPrompt() into every AI agent's
 * system prompt, preventing known bugs from being replicated in generated user apps.
 *
 * Run: node src/scripts/seed-lessons.js
 * Idempotent: uses upsert, safe to run multiple times.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Lesson   = require('../models/Lesson');

const LESSONS = [
  // ── frontend_scaffold ─────────────────────────────────────────────────────
  {
    agentType: 'frontend_scaffold',
    category:  'code_quality',
    mistake:   'Variable used inside useEffect is declared AFTER the hook — causes Temporal Dead Zone (TDZ) crash in Vite ESM',
    lesson:    'הצהר על כל משתנה שuseEffect משתמש בו לפני ה-hook, לא אחריו. Vite ESM מריץ hoisting שונה מ-CJS.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'code_quality',
    mistake:   'Two separate import statements from the same module path in one file — Vite ESM causes TDZ initialization error',
    lesson:    'אל תכתוב שני import נפרדים מאותו module. מזג אותם לשורה אחת: import { a, b, c } from "module".',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'architecture',
    mistake:   'After logout, previous user data remains in Redux store — user B sees user A data after account switch',
    lesson:    'הוסף addMatcher ל-extraReducers של כל slice: כאשר auth/logout/fulfilled — אפס ל-initialState. זה מונע דליפת נתונים בין משתמשים.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'Mobile inputs trigger iOS auto-zoom when font-size < 16px — breaks layout and UX',
    lesson:    'הגדר font-size: 16px מינימום על כל input ו-textarea ב-mobile breakpoint. מנע zoom אוטומטי ב-iOS Safari.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'min-height: 100vh cuts off content on mobile browsers with dynamic chrome (address bar + bottom bar)',
    lesson:    'השתמש ב-min-height: 100svh (לא 100vh) ל-full-screen sections. svh מתחשב ב-chrome הדינמי של הדפדפן במובייל.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'Chat or list UI uses fixed max-height — messages area does not fill available viewport height on mobile',
    lesson:    'container של chat/list: display: flex; flex-direction: column; flex: 1; min-height: 0. messages area: flex: 1; overflow-y: auto. אסור להשתמש ב-max-height קבוע.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'position: sticky header fails on mobile because a parent div has overflow: hidden — header scrolls with content',
    lesson:    'sticky header עובד רק כשה-scroll container הוא ה-window. אל תשים overflow: hidden על parent של sticky element.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'Android long-press on text triggers system dictionary popup — breaks native app feel',
    lesson:    'הוסף ל-CSS global reset: * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; } למניעת ה-popup.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'Browser autofill overlays appear on top of inputs — visual glitch on mobile Chrome/Safari',
    lesson:    'הוסף autoComplete="off" ו-spellCheck={false} על כל input ו-textarea. מונע overlays של autofill הדפדפן.',
  },
  {
    agentType: 'frontend_scaffold',
    category:  'ux',
    mistake:   'Flash of wrong theme (FOUC) on page reload — user sees light theme for a moment before dark loads',
    lesson:    'החל theme ו-direction (rtl/ltr) מה-localStorage ב-inline <script> ב-index.html לפני שה-bundle של React נטען.',
  },

  // ── backend_scaffold ──────────────────────────────────────────────────────
  {
    agentType: 'backend_scaffold',
    category:  'security',
    mistake:   'Refresh token endpoint uses Joi .required() on request body — fails when token comes from httpOnly cookie',
    lesson:    'ה-refresh token מגיע מ-httpOnly cookie, לא מה-body. אל תוסיף .required() על ה-body בנקודת ה-/refresh. קרא מ-req.cookies.',
  },
  {
    agentType: 'backend_scaffold',
    category:  'security',
    mistake:   'CORS configured with wildcard (*) and credentials: true — browsers block the request',
    lesson:    'כש-credentials: true, חובה להגדיר origin כמערך מפורש של URLs, לא wildcard (*). כלול גם את כתובת ה-frontend.',
  },
  {
    agentType: 'backend_scaffold',
    category:  'security',
    mistake:   'Route returns data without filtering by userId — user can access another user\'s data by changing an ID',
    lesson:    'כל service method חייב לסנן לפי ownerId/userId של המשתמש המחובר. אל תסמוך על userId מה-body — השתמש תמיד ב-req.user.id.',
  },
  {
    agentType: 'backend_scaffold',
    category:  'security',
    mistake:   'Stack trace or raw Mongoose error message sent to client in error response',
    lesson:    'Global error middleware שולח ללקוח רק { error: "..." } כללי. לוג את השגיאה המלאה ב-Winston. אל תחשוף stack trace או DB errors.',
  },
  {
    agentType: 'backend_scaffold',
    category:  'architecture',
    mistake:   'Server crashes silently on SIGTERM (Render/Heroku deploy) — in-flight requests are dropped',
    lesson:    'הוסף handlers ל-SIGTERM ו-SIGINT: סגור HTTP connections, סגור Mongoose, אחר כך process.exit(0). גם process.on("unhandledRejection") → log + exit(1).',
  },

  // ── db_schema ─────────────────────────────────────────────────────────────
  {
    agentType: 'db_schema',
    category:  'architecture',
    mistake:   'Mongoose find() without limit — returns entire collection, causes memory issues on large datasets',
    lesson:    'הוסף .limit() לכל .find() query. אל תחזיר collection ללא הגבלה. השתמש ב-pagination (skip + limit).',
  },
  {
    agentType: 'db_schema',
    category:  'architecture',
    mistake:   'Fields used in where clauses have no index — queries slow down as data grows',
    lesson:    'הוסף index על כל field שמשמש ב-find/where: { fieldName: 1, index: true } בסכמה. כולל createdAt לsorting.',
  },

  // ── tests ─────────────────────────────────────────────────────────────────
  {
    agentType: 'tests',
    category:  'code_quality',
    mistake:   'Tests mock the database — mocked tests pass but real queries fail after migration',
    lesson:    'בדיקות integration חייבות לפגוע ב-DB אמיתי (test DB). אל תעשה mock ל-Mongoose. זה מונע גילוי באגים של migration.',
  },

  // ── config ────────────────────────────────────────────────────────────────
  {
    agentType: 'config',
    category:  'security',
    mistake:   'JWT_SECRET is a short or predictable string — vulnerable to brute-force',
    lesson:    'JWT_SECRET ו-JWT_REFRESH_SECRET חייבים להיות לפחות 64 תווים אקראיים. הוסף ל-.env.example עם הערה ברורה לגבי אורך מינימלי.',
  },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let inserted = 0;
  let updated  = 0;

  for (const lesson of LESSONS) {
    const result = await Lesson.findOneAndUpdate(
      { agentType: lesson.agentType, mistake: lesson.mistake },
      {
        $setOnInsert: {
          category:    lesson.category,
          lesson:      lesson.lesson,
          isActive:    true,
          projectCount: 1,
        },
        $set:  { lastSeenAt: new Date() },
        $max:  { occurrenceCount: 99 },
      },
      { upsert: true, new: false },
    );
    if (result) { updated++; } else { inserted++; }
  }

  console.log(`Done — inserted: ${inserted}, updated/unchanged: ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
