╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-verify  |  v1.1  |  TIER: 3  |  BUDGET: LEAN        ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L3 · L4 · L7                                   ║
║ AUTHORITY     ║ OBSERVER + WRITE (STATUS.md only)                   ║
║ CAN           ║ - Run: tsc --noEmit                                  ║
║               ║ - Run: jest on affected files only                   ║
║               ║ - Run: secret scan on changed files                  ║
║               ║ - Read: git diff, invariants                         ║
║               ║ - Write: ai/STATUS.md (metrics sync only)            ║
║ CANNOT        ║ - Modify any source files                            ║
║               ║ - Commit or push                                     ║
║ WHEN TO RUN   ║ - After every cortex-build / cortex-fix / cortex-feature ║
║               ║ - Before every cortex-commit                         ║
║               ║ - Before cortex-prelaunch                            ║
║ OUTPUTS       ║ - PASS / FAIL per phase · actionable error list      ║
║               ║ - STATUS.md test counts synced (always)              ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Post-build verification gate. Run after every code change to catch errors
before they compound. 7 phases — stop at first FAIL, fix it, re-run.

HARD RULE — NO LOOSE ENDS:
  Verified numbers must propagate to ALL reference points in the same
  operation. Phase 6 is non-negotiable — it runs even if other phases warn.

$ARGUMENTS

Parse from $ARGUMENTS:
- `fast` — skip test phase (tsc + secrets + diff only)
- `full` — run full test suite instead of affected files only

---

## MODEL HINT

This skill is read-only and runs shell commands. Use **Haiku** if routing
is available — verification doesn't need Sonnet-level reasoning.

---

## PHASE 0 — Score Gate (always run first)

Read current score:
```bash
cat ai/state/current-score.json 2>/dev/null | grep '"overall"' | head -1
```

Read baseline (score at last commit):
```bash
cat ai/state/score-baseline.json 2>/dev/null | grep '"overall"' | head -1
```

Apply 3-tier gate in order:

| Gate | Condition | Decision |
|------|-----------|----------|
| FLOOR | current score < 80 | BLOCK — project health too low for any work |
| REGRESSION | dropped > 5 pts from baseline | BLOCK — recent changes degraded quality, fix before proceeding |
| FEATURE UNLOCK | current score < 95 | WARN — new features blocked (fixes, tests, and refactors OK) |

If `ai/state/current-score.json` does not exist → skip this phase silently (first run).
If `ai/state/score-baseline.json` does not exist → skip regression check only.

Output:
```
Phase 0  Score Gate    PASS ✔  [score]/100  (floor OK · no regression · feature-unlocked)
Phase 0  Score Gate    WARN ⚠  [score]/100  (< 95 — new features blocked)
Phase 0  Score Gate    FAIL ✖  [score]/100  BLOCK reason: [floor/regression]
```

If BLOCK → stop. Output:
```
SCORE GATE BLOCKED
  Score:     [current]/100  (baseline: [baseline]/100)
  Reason:    [FLOOR < 80 | REGRESSION: dropped [N] pts]
  Required:  Fix score issues first → run /cert-score to diagnose
  Override:  Not available — score gate is non-negotiable
```

---

## PHASE 1 — TypeScript (always run)

```bash
npx tsc --noEmit 2>&1
```

- PASS: zero errors, exit 0
- FAIL: list every error with file:line. Stop here. Fix before continuing.

---

## PHASE 2 — Affected tests (skip if `fast` flag)

Get changed files:
```bash
git diff --name-only HEAD 2>/dev/null
```

Map changed source files to test files:
- `src/modules/auth/auth.service.ts` → `src/modules/auth/auth.service.spec.ts`
- `src/modules/orders/*.ts` → `src/modules/orders/*.spec.ts`
- If no matching spec file exists → note it, skip (don't fail)

Run affected tests only:
```bash
npx jest --testPathPattern="<affected-module>" --no-coverage 2>&1 | tail -20
```

If `full` flag: run `npx jest --no-coverage 2>&1 | tail -20`

- PASS: 0 failures
- FAIL: list failing tests with error messages. Fix before continuing.

---

## PHASE 3 — Secret scan (always run)

Scan only changed files:
```bash
git diff --name-only HEAD | xargs grep -l "sk-ant-\|sk-\|AIza\|AKIA" 2>/dev/null
git diff --name-only HEAD | xargs grep -lE "(apiKey|secret|password)\s*=\s*['\"][^$'\"]{8,}" 2>/dev/null
```

- PASS: no matches
- FAIL: list files + line numbers. HARD STOP — do not proceed. Run `/cortex-secrets`.

---

## PHASE 4 — Invariant spot-check (always run)

Read the Quick Reference block from `ai/memory/INVARIANT_MEMORY.md` (if present)
or from the project's equivalent invariant file.

For each changed file, verify the relevant invariant still holds:

| Changed module | Invariant to check |
|---|---|
| `orders/` `payments/` `coupons/` | `prisma.$transaction` wraps multi-table writes |
| `payments/` controller | `createHmac` present for webhook verification |
| Any `*.controller.ts` | No direct `prisma.` calls — must go through service |
| Any service | No `any` type returned from DB queries |

Method: `grep` the changed files for the required pattern.

**Execution Refusal Contract (Cortex repo — always check when skills/do.md or skills/fix.md changed):**

```bash
grep -l "HARD RULE" skills/do.md skills/fix.md 2>/dev/null
grep -l "DO NOT ROUTE" skills/do.md skills/fix.md 2>/dev/null
```

Both markers must be present in both files. If either is missing:
```
INVARIANT VIOLATED — Execution Refusal Contract
  File:    [skills/do.md | skills/fix.md]
  Missing: ["HARD RULE" | "DO NOT ROUTE"]
  Meaning: Step 0 Execution Refusal Gate has been softened or removed.
  Action:  Restore the gate before committing. This is a governance invariant.
```

This is how progressive softening is caught before it ships.

- PASS: all relevant invariants found in changed code
- FAIL: list which invariant is missing and in which file. Fix before committing.

---

## PHASE 5 — Diff review (always run)

---

## PHASE 6 — Metrics Sync (always run — even if phases 1–5 warn)

**Purpose:** Verified numbers must never exist in only one place.
STATUS.md is the single source of truth. All reports read from it — they never hold their own counts.

### Step 6.1 — Get real test counts (run BOTH suites, always both)

```bash
# Unit / integration
npx jest --no-coverage --forceExit 2>&1 | grep "^Tests:"

# E2E (only if jest-e2e.config.js exists)
npx jest --config test/jest-e2e.config.js --no-coverage --forceExit 2>&1 | grep "^Tests:"
```

Record:
- `unit_total` — number after "Tests:" from first run
- `e2e_total`  — number after "Tests:" from second run (0 if no e2e config)
- `grand_total` = unit_total + e2e_total

### Step 6.2 — Sync to STATUS.md

Update the Test Coverage table in `ai/STATUS.md`:

```
| exena-api | {unit_total} unit ({N} suites) + {e2e_total} E2E ({N} suites) = {grand_total} total | ✅ DB-live verified {today} |
```

**HARD RULE:** Only write numbers you just ran and read from terminal output.
Never copy numbers from memory, previous reports, or previous sessions.

### Step 6.3 — Check downstream references

Scan for any file that holds a test count:
```bash
grep -rl "passing\|tests\|assertions\|test suites" ai/ *.md 2>/dev/null | grep -v STATUS.md
```

For each file found: verify its count matches STATUS.md.
If it doesn't → update it now. Do not leave the session with stale counts anywhere.

Output:
```
Phase 6  Metrics Sync   PASS ✔  unit={N} · e2e={N} · total={N} · STATUS.md updated
Phase 6  Metrics Sync   WARN ⚠  {file} count stale → updated
Phase 6  Metrics Sync   FAIL ✖  Could not run test suite — manual count required
```

---

```bash
git diff --stat HEAD 2>/dev/null
git diff HEAD 2>/dev/null | head -100
```

Check for:
- [ ] Files changed that weren't expected (scope creep)
- [ ] `console.log` / `console.error` left in source (not test files)
- [ ] TODO / FIXME / HACK comments introduced
- [ ] Commented-out code blocks

For each issue found: flag it. These are warnings, not failures (unless console.log in production path).

---

## OUTPUT FORMAT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-verify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 0  Score Gate    PASS ✔ / WARN ⚠️ / FAIL ✖  {score}/100
Phase 1  TypeScript    PASS ✔ / FAIL ✖  {N errors}
Phase 2  Tests         PASS ✔ / FAIL ✖  {N failed} / SKIP (fast mode)
Phase 3  Secrets       PASS ✔ / FAIL ✖  {files if fail}
Phase 4  Invariants    PASS ✔ / FAIL ✖  {N/N checked}
Phase 5  Diff review   PASS ✔ / WARN ⚠️  {issues}
         Logs:         OK / {N} console.log in modified files
Phase 6  Metrics Sync  PASS ✔  unit={N} · e2e={N} · total={N} · STATUS.md synced
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERDICT:  CLEAN ✔  /  FIX REQUIRED ✖
Ready for PR: YES / NO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If FAIL on any phase:
```
Fix required:
  1. {specific error · file:line}
  2. {specific error · file:line}
Re-run /cortex-verify after fixing.
```

---

## COMPLETION

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-verify                  COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verdict     CLEAN ✔
Phases      7/7 passed
Metrics     unit={N} · e2e={N} · total={N} → STATUS.md synced
Next        /cortex-commit  (if ready to commit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
