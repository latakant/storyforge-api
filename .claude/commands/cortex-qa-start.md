╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-qa-start  |  v1.0  |  TIER: 2  |  BUDGET: LEAN   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ SERVICE       ║ SERVICE 4 — QA / TESTING                           ║
║ AUTHORITY     ║ ANALYST                                             ║
║ CAN           ║ - Read ai/STATUS.md (what was built this sprint)   ║
║               ║ - Read ai/state/design-handoff.json (what screens) ║
║               ║ - Read ai/state/sprint.json (sprint scope)         ║
║               ║ - Generate a test plan: cases by feature + priority║
║               ║ - Gate: all critical paths covered before QA ready ║
║ CANNOT        ║ - Write or run tests                               ║
║               ║ - Modify source files                              ║
║ REQUIRES      ║ - Development service complete (score ≥ 95)        ║
║ OUTPUTS       ║ - ai/qa/QA-PLAN-[date].md                         ║
║               ║ - ai/state/qa-state.json                          ║
║ FEEDS         ║ - /cortex-qa-report (reads QA-PLAN + test results) ║
╚═══════════════╩══════════════════════════════════════════════════════╝

QA as a formal service. Runs after development is complete, before staging.
Produces a structured test plan that can be read by QA engineer or AI agent.

$ARGUMENTS

---

## STEP 1 — Gate check

Read `ai/STATUS.md` → extract current score.
If score < 95 → STOP:
```
🚫 QA GATE BLOCKED
   Current score: {score}/100
   Required:      95/100 minimum
   Fix:           /cert-verify → resolve all issues → /cert-score → re-run /cortex-qa-start
```

If score ≥ 95 → proceed.

---

## STEP 2 — Load sprint scope

Read `ai/state/sprint.json` if it exists.

```json
{
  "sprintNumber": 3,
  "scope": ["feature-A", "feature-B", "bug-C"],
  "completed": ["feature-A", "feature-B"],
  "deferred": []
}
```

If file missing → read `ai/STATUS.md` Phase/Next section for current deliverables.
Extract: list of completed features or modules in this development cycle.

---

## STEP 3 — Load design context

Read `ai/state/design-handoff.json` if it exists.

Extract: list of screens designed, their API endpoints, and component inventory.
This becomes the UI test surface — every screen needs at least a smoke test.

If missing → note "No design handoff found — UI coverage from STATUS.md only."

---

## STEP 4 — Generate test plan

Produce a structured test plan organized by priority:

```markdown
# QA Plan — [project name] · [date]
# Sprint: [N] | Scope: [N features]

## P1 — Critical Paths (must pass before staging)
[For each core business flow:]
### [Flow name] — e.g. Order Placement Flow
- [ ] Happy path: [step-by-step what to verify]
- [ ] Edge case: [specific boundary condition]
- [ ] Error case: [what should fail gracefully]
  API: [endpoint tested]
  Test file: [expected test file location]
  Type: [unit | e2e | manual]

## P2 — Feature Coverage (regression scope)
[For each feature delivered in this sprint:]
### [Feature name]
- [ ] [test case]
  Type: [unit | integration | e2e]

## P3 — Design Verification (UI smoke tests)
[For each screen in design-handoff.json:]
### [Screen name]
- [ ] Page renders without error
- [ ] Required data loads (API call succeeds)
- [ ] Primary action works end-to-end

## P4 — Non-functional
- [ ] No TypeScript errors (npx tsc --noEmit)
- [ ] Security: /cert-security passes (0 critical findings)
- [ ] Performance: p95 response < 200ms on core endpoints (/cert-perf)
- [ ] Coverage: ≥ 80% on new modules

## Summary
P1 cases: [N]
P2 cases: [N]
P3 cases: [N]
Total:    [N]
```

Rules for generating test cases:
- Every endpoint in design-handoff.json → at least 1 P1 or P2 case
- Every status transition (e.g. PENDING → CONFIRMED) → 1 P1 case
- Money flows (payment, invoice, refund) → always P1
- Auth flows → always P1
- CRUD operations → P2 unless business-critical

---

## STEP 5 — Write QA state file

Write `ai/state/qa-state.json`:

```json
{
  "status": "PLAN_READY",
  "date": "[YYYY-MM-DD]",
  "sprint": [sprint number or null],
  "planFile": "ai/qa/QA-PLAN-[date].md",
  "totalCases": [N],
  "p1Cases": [N],
  "p2Cases": [N],
  "p3Cases": [N],
  "passedCases": 0,
  "failedCases": 0,
  "blockedCases": 0,
  "verdict": "PENDING"
}
```

Write `ai/qa/QA-PLAN-[date].md` with the test plan from Step 4.

If `ai/qa/` directory doesn't exist → create it.

---

## STEP 6 — Surface next actions

```
QA PLAN READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total test cases: [N]
  P1 Critical:    [N] — must all pass for staging
  P2 Regression:  [N]
  P3 UI smoke:    [N]
  P4 Non-func:    [N]

How to proceed:
1  Run tests manually        → check off each case in QA-PLAN-[date].md
2  Run automated tests       → npm test · npx playwright test
3  Run non-func checks       → /cert-security · /cert-perf
4  When done → /cortex-qa-report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-qa-start               COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan       ai/qa/QA-PLAN-[date].md
Cases      [N] total · [N] P1 · [N] P2
State      ai/state/qa-state.json → PLAN_READY
Next       run tests → /cortex-qa-report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
