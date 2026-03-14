╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-verify  |  v1.0  |  TIER: 3  |  BUDGET: LEAN        ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L3 · L4 · L7                                   ║
║ AUTHORITY     ║ OBSERVER                                             ║
║ CAN           ║ - Run: tsc --noEmit                                  ║
║               ║ - Run: jest on affected files only                   ║
║               ║ - Run: secret scan on changed files                  ║
║               ║ - Read: git diff, invariants                         ║
║ CANNOT        ║ - Modify any source files                            ║
║               ║ - Commit or push                                     ║
║ WHEN TO RUN   ║ - After every cortex-build / cortex-fix / cortex-feature ║
║               ║ - Before every cortex-commit                         ║
║               ║ - Before cortex-prelaunch                            ║
║ OUTPUTS       ║ - PASS / FAIL per phase · actionable error list      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Post-build verification gate. Run after every code change to catch errors
before they compound. 5 phases — stop at first FAIL, fix it, re-run.

$ARGUMENTS

Parse from $ARGUMENTS:
- `fast` — skip test phase (tsc + secrets + diff only)
- `full` — run full test suite instead of affected files only

---

## MODEL HINT

This skill is read-only and runs shell commands. Use **Haiku** if routing
is available — verification doesn't need Sonnet-level reasoning.

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

- PASS: all relevant invariants found in changed code
- FAIL: list which invariant is missing and in which file. Fix before committing.

---

## PHASE 5 — Diff review (always run)

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
Phase 1  TypeScript    PASS ✔ / FAIL ✖  {N errors}
Phase 2  Tests         PASS ✔ / FAIL ✖  {N failed} / SKIP (fast mode)
Phase 3  Secrets       PASS ✔ / FAIL ✖  {files if fail}
Phase 4  Invariants    PASS ✔ / FAIL ✖  {N/N checked}
Phase 5  Diff review   PASS ✔ / WARN ⚠️  {issues}
         Logs:         OK / {N} console.log in modified files
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
Phases      5/5 passed
Next        /cortex-commit  (if ready to commit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
