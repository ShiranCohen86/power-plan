// ── Pipeline ──────────────────────────────────────────────────────────────────
const TOTAL_PLANNING_PHASES    = 12;
const MAX_CONCURRENT_PIPELINES = 5;
const RATE_LIMIT_STARTS_PER_HOUR = 3;
const LESSON_INJECT_LIMIT      = 10;
const MAX_PHASE_REFINES        = 2;

// ── Auth / tokens ─────────────────────────────────────────────────────────────
const TOKEN_EXPIRY_ACCESS      = '15m';
const TOKEN_EXPIRY_REFRESH     = '30d';
const BCRYPT_ROUNDS            = 12;

// ── Pagination ────────────────────────────────────────────────────────────────
const DEFAULT_PAGE_SIZE  = 12;
const MAX_PAGE_SIZE      = 50;
const ACTIVITY_PAGE_SIZE = 20;

// ── Discovery ─────────────────────────────────────────────────────────────────
const MAX_DISCOVERY_ANSWERS    = 20;
const DISCOVERY_TIMEOUT_MS     = 5 * 60 * 1000;

// ── Lessons ───────────────────────────────────────────────────────────────────
const LESSON_MIN_LENGTH = 10;
const LESSON_MAX_LENGTH = 500;
const LESSON_PRESEED_OCCURRENCE_COUNT = 99;

// ── Rate limits ───────────────────────────────────────────────────────────────
const RATE_AUTH_WINDOW_MS   = 15 * 60 * 1000;
const RATE_AUTH_MAX         = 10;
const RATE_API_WINDOW_MS    = 15 * 60 * 1000;
const RATE_API_MAX          = 100;

// ── Codegen ───────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES   = 150_000;
const MAX_FILES_PER_PHASE   = 60;
const R2_CONTENT_MAX_CHARS  = 3000;

module.exports = {
  TOTAL_PLANNING_PHASES, MAX_CONCURRENT_PIPELINES, RATE_LIMIT_STARTS_PER_HOUR,
  LESSON_INJECT_LIMIT, MAX_PHASE_REFINES,
  TOKEN_EXPIRY_ACCESS, TOKEN_EXPIRY_REFRESH, BCRYPT_ROUNDS,
  DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ACTIVITY_PAGE_SIZE,
  MAX_DISCOVERY_ANSWERS, DISCOVERY_TIMEOUT_MS,
  LESSON_MIN_LENGTH, LESSON_MAX_LENGTH, LESSON_PRESEED_OCCURRENCE_COUNT,
  RATE_AUTH_WINDOW_MS, RATE_AUTH_MAX, RATE_API_WINDOW_MS, RATE_API_MAX,
  MAX_FILE_SIZE_BYTES, MAX_FILES_PER_PHASE, R2_CONTENT_MAX_CHARS,
};
