# Refactor Task

You are performing a **structural refactor** of the code I point you to. The goal is to improve quality WITHOUT changing observable behavior.

## Operating Rules (read first, do not violate)

1. **Plan Mode first.** Do not edit anything until I approve the plan.
2. **One file at a time.** Never modify multiple files in the same step.
3. **Behavior must not change.** This is refactor, not rewrite. If you find a bug, REPORT it — do not silently fix it.
4. **Stop on failure.** If lint or tests fail after a change, STOP and report. Do not continue.
5. **No new dependencies** without asking.
6. **No architectural changes** (folder structure, modules, API contracts) without asking.
7. **Show diffs** for non-trivial changes before applying.
8. **No bundling.** One concern per commit.

## Workflow

### Phase 1 — Analyze (Plan Mode)

For each target file:

1. Read the file fully.
2. Map every place each variable/constant/value is used. Flag duplicates.
3. Produce a numbered list of issues grouped by the categories in the Checklist below.
4. For each issue assign risk: LOW / MEDIUM / HIGH.
5. Output the plan. Wait for my approval.

### Phase 1.5 — Deletion Approval (if any deletions proposed)

After plan approval but before Phase 2, I will go through each deletion candidate individually.
Do not proceed to Phase 2 until each "DELETE? (y/n)" has been answered.

### Phase 2 — Execute (after approval)

For each file:

1. Apply changes.
2. Run linter. Run tests.
3. Report results with diff summary.
4. Wait for confirmation before next file.

### Phase 3 — Final Report

- Files changed and category counts
- Anything skipped + why
- Bugs found (separately, not fixed)
- Recommended follow-ups

## Checklist (apply to every file)

### Naming
- Names describe purpose, not type
- Booleans start with is/has/should/can
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase
- Functions: camelCase, verb-first (getUser, not user)
- No abbreviations except universal (id, url, http, db)
- No single letters except loop counters

### Modern JavaScript (ES6+)
- `var` → `const` (default) or `let`
- Function expressions → arrow functions (NOT for class methods or when `this` matters)
- Destructuring for objects and arrays
- Template literals instead of string concatenation
- Spread/rest instead of `Object.assign` / `.apply`
- `.then()` chains → `async/await`
- Optional chaining `?.` and nullish coalescing `??`
- ES modules (`import/export`) where applicable

### DRY — Single Source of Truth
- Any literal value appearing in 2+ places → extract as named constant
- Any logic appearing in 2+ places → extract as function
- Magic numbers and strings → named constants in a constants file
- Repeated try/catch wrappers → utility
- Repeated validation → reusable validator
- **Critical**: when a value has multiple definitions, find them ALL. Use grep across the codebase. List every occurrence in the plan.

### Error Handling
- Wrap all I/O, network, JSON.parse, and async operations in `try/catch`
- Catch specific error types before generic
- Never swallow errors silently — log at minimum
- Custom Error classes for domain errors
- Async functions must handle rejections
- Validate that errors propagate correctly to callers

### Function Design
- Single Responsibility — one purpose per function
- Max 3 parameters (else use options object)
- Early returns over nested if/else
- Functions under ~40 lines unless justified
- Pure functions where possible
- No hidden side effects

### Immutability and State
- Do not mutate function arguments
- Do not mutate state objects — return new ones
- `map/filter/reduce` over `push/splice` on shared data
- Freeze configuration

### Edge Cases (audit each function)
- Empty arrays/objects/strings
- `null` and `undefined` inputs
- Zero, negatives, very large numbers
- Concurrent calls / race conditions
- Network failures, timeouts
- Permission / auth failures

### Type Safety
- TypeScript: no `any`, explicit return types on public functions
- JavaScript: JSDoc on public functions
- Validate external data at boundaries (API responses, user input, env vars)

### Performance
- No `await` inside loops for independent operations — use `Promise.all`
- Memoize expensive pure computations
- Debounce/throttle user-input handlers
- Lazy-load heavy modules
- React: `useMemo`, `useCallback`, `React.memo` where appropriate (do not over-apply)

### Security
- Validate and sanitize all user input
- Parameterized queries only — no string concatenation in SQL
- Secrets only in env vars — never in code or logs
- Escape output to prevent XSS
- Verify CORS, rate limits, auth on every endpoint
- Never log secrets, tokens, full PII

### Async Correctness
- `Promise.all` for independent parallel work
- Sequential `await` only when truly dependent
- `AbortController` for cancellable requests
- Cleanup subscriptions, timers, listeners

### Logging
- Structured logger (not `console.log`) if one exists
- Appropriate level (debug/info/warn/error)
- Include context (request id, etc.) — never secrets/PII

### Code Organization
- One responsibility per file
- No circular dependencies
- Import order: external → internal → relative
- Remove unused imports, variables, exports (see Dead Code section for process)

### Comments
- Comments explain WHY, not WHAT
- Remove or update stale comments
- JSDoc only for public APIs

### React-Specific (if applicable)
- Complete `useEffect` dependency arrays with cleanup
- Stable, unique keys in lists (not array index if reorderable)
- Custom hooks for reusable stateful logic
- No components defined inside other components
- Lift state only when needed

### Accessibility (if UI)
- Semantic HTML
- ARIA labels on non-semantic interactive elements
- Keyboard navigation works
- Focus management
- Color contrast meets WCAG AA

### Backwards Compatibility
- Do not change exported function signatures without flagging
- Do not rename exported symbols without flagging
- If a breaking change is needed, list every consumer first

### Regression Traps — Lessons from Production Bugs

These are patterns that *look* safe but silently break behavior. Check each one explicitly.

#### Helper Extraction — call-site behavioral equivalence

When extracting repeated code into a shared helper, **enumerate every call site** and verify that each one should behave identically. If even one differs, add a parameter flag — don't silently change behavior.

> **Real bug:** `_finalizeLogin()` extracted from signup/login/OAuth/WebAuthn. All paths got `user.lastLogin = new Date()` — but `refresh()` should NOT update lastLogin (it fires every 15 minutes, corrupting activity timestamps). Fix: `updateLastLogin = true` parameter, `refresh()` passes `false`.

**Rule:** Before finalizing a helper extraction, read every caller and ask: "Does this path want the exact same side effects?" If no → parameterize, not silently include.

---

#### Mongoose — nested array sub-document mutations need `markModified()`

Mongoose tracks changes to top-level fields automatically. It does **not** detect mutations to fields *inside* embedded sub-documents in arrays. After changing `array[i].field = value`, call `doc.markModified('arrayFieldName')` before `save()`.

> **Real bug:** `storedCred.counter = newCounter` (storedCred is a WebAuthn credential inside `user.webAuthnCredentials[]`). Without `user.markModified('webAuthnCredentials')`, the counter change was silently lost — destroying WebAuthn anti-replay protection.

**Rule:** Any time a property is mutated on an element of a Mongoose array (`doc.arr[i].x = v`), add `doc.markModified('arr')` on the next line.

---

#### Mongoose `findByIdAndUpdate` with `{ new: true }` — null-check the result

`findByIdAndUpdate` returns `null` if no document matches. With `{ new: true }` the result is the updated document — or `null` if it was deleted between the previous check and the update. Accessing properties on null crashes.

> **Real bug:** `const updated = await Project.findByIdAndUpdate(..., { new: true }).lean(); if (updated.approvalGates !== false)` — crashes if project was deleted during the pipeline run.

**Rule:** After any `findByIdAndUpdate` / `findOneAndUpdate` used for its return value, add: `if (!updated) { /* handle */ break/return/throw }` before accessing its properties.

---

#### DRY — after extracting a constant, grep the entire file for the raw literal

Extracting `const X = 12` at the top removes the declaration, but other inline uses of `12` elsewhere in the same file remain. Always grep the file for the original literal after extraction.

> **Real bug:** `DASHBOARD_PAGE_SIZE` extracted and used in 3 thunks, but `Math.floor(projects.length / 12)` in `handleLoadMore` was missed — pagination would break if the constant was ever changed.

**Rule:** After creating a named constant, run: grep the file for every occurrence of the raw value. Replace all of them.

---

#### npm `--force` / `--legacy-peer-deps` installs — verify peer deps afterward

When `npm audit fix --force` upgrades a major version, peer dependencies of other packages may silently break (they install via `--force` but fail on fresh `npm install`). Always run `npm install` (without flags) after forced upgrades to verify clean resolution.

> **Real bug:** `npm audit fix --force` upgraded Vite 5→8, but `@vitejs/plugin-react@4.x` declared `peer vite@"^4-7"`. The repo built fine (lock file had forced resolution) but `npm ci` on CI/fresh checkout failed.

**Rule:** After any `npm audit fix --force`, immediately run plain `npm install`. If it fails with ERESOLVE, upgrade the conflicting package to a version that supports the new major.

---

### Testing and Verification
- All existing tests must pass after the refactor
- If critical paths lack tests, flag them — do not auto-add
- Run lint + tests after every file

### Dead Code & Unused Artifacts Removal

This is a **destructive, irreversible** category. Different rules apply:

**General rule:** NEVER delete in Phase 2 (Execute) without explicit per-item approval. List every deletion candidate in the plan with full justification. I will approve each item individually in Phase 1.5.

**Verification before flagging anything as unused:**
1. Search the entire repo (not just src/) — include tests, configs, scripts, docs
2. Search for the symbol/filename as a **string** too — catches dynamic imports like `import(\`./pages/${name}\`)` and config-driven references
3. Check `package.json` scripts and CI workflows
4. Check whether it's part of a public API (exported from index files, documented)
5. Check git log — if it was added recently it may be in-progress, not abandoned
6. If ANY uncertainty exists → mark as "SUSPECTED UNUSED — needs human verification", do not auto-delete

**What to audit:**
- Unused variables, parameters, imports
- Unused functions, classes, methods — verify across the whole repo, including tests
- Unused exports — a function used internally but exported unnecessarily should lose the export, not be deleted
- Unused files — list with full path; check for dynamic requires and config references
- Empty directories after file removal — list for deletion
- Commented-out code blocks — delete (git history preserves them)
- Unreachable code — code after `return`, dead branches, `if (false)`, etc.
- Unused dependencies in `package.json` — flag both `dependencies` and `devDependencies`. Watch out for: peer deps, deps used only in configs (eslint plugins, postcss, etc.), deps used via CLI scripts
- Unused TypeScript types/interfaces — exported types with zero importers
- Unused CSS classes / styled-components / SCSS variables — flag, but warn that runtime class composition may give false positives
- Unused assets — images, fonts, icons, SVGs not referenced anywhere (search by filename string in code AND configs AND markdown)
- Unused environment variables — entries in `.env.example` / `.env` not referenced via `process.env.X` anywhere
- Unused config keys — keys in config files with no readers
- Unused feature flags — flags that are always-on or always-off in current code
- Unused database migrations / seeds — flag with EXTRA caution, never auto-delete (production may depend on them)
- Unused test fixtures / mocks / snapshots — orphaned snapshot files, fixtures referenced by deleted tests
- Unused translation keys — i18n keys with no usage in code or templates
- Dead routes / endpoints — API routes or page routes with no callers (verify external consumers don't hit them)
- Stale TODO/FIXME comments — flag for review, not auto-delete

**Output format for this section in the plan:**

```
[Dead Code / Unused]

CONFIDENT (search verified across full repo + configs + tests):
- File: src/utils/legacy-formatter.ts — no importers, no string refs — DELETE? (y/n)
- Function: parseOldFormat() in src/parser.ts:88 — no callers — DELETE? (y/n)
- Dependency: "moment" in package.json — no imports found — REMOVE? (y/n)

SUSPECTED (needs human verification):
- File: src/handlers/webhook-v1.ts — no internal callers BUT may be hit by external clients
- Asset: public/icons/legacy-logo.svg — referenced only in markdown file, may be live in docs
- Migration: 20220103_drop_users_table.sql — no code refs but DO NOT DELETE without DBA review

EMPTY DIRECTORIES (after above deletions):
- src/utils/legacy/
- src/handlers/v1/
```

**Hard rules for deletion:**
- Database migrations: NEVER auto-delete, even if "unused" in code
- Public API exports: NEVER auto-delete without confirming no external consumers
- Files added in the last 30 days: flag as "recent — verify intent" before deletion
- If a deletion would leave dangling imports anywhere, fix the imports in the SAME atomic step or don't delete
- Delete in dependency order: leaves first, then files that imported them
- After every deletion: run typecheck + tests immediately, before moving to next file

## Output Format for the Plan

```
File: src/path/to/file.ts

Issues found (grouped by category):

[Naming]
1. `d` on line 23 — unclear, suggest `daysElapsed` — risk: LOW
2. `processData` on line 47 — vague, suggest `parseInvoiceRows` — risk: LOW

[DRY]
3. Magic number 86400 appears on lines 12, 89, 134 — extract `SECONDS_PER_DAY` — risk: LOW
4. URL "https://api.x.com/v1" appears in 4 files — extract to config — risk: MEDIUM (cross-file change)

[Error handling]
5. fetch on line 56 has no try/catch — risk: HIGH (silent failure path)

[Dead Code / Unused]
6. (use the format from the Dead Code section above)

... etc

Estimated impact: X low / Y medium / Z high risk changes.
Awaiting approval.
```

## What you must NEVER do without asking
- Add or upgrade dependencies
- Change file/folder structure
- Change public API signatures
- Fix bugs (report instead)
- Reformat the entire file when only specific lines need changes
- Combine unrelated changes
- Delete any file, directory, dependency, migration, or asset without explicit per-item approval
- Delete anything flagged as "SUSPECTED" — only items I confirmed
- Mass-delete multiple items in one operation — one deletion per step, verify, continue