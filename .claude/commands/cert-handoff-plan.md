╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cert-handoff-plan  |  v1.0  |  TIER: 1  |  BUDGET: LEAN   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 (Intent) + L5 (Agent)                           ║
║ AUTHORITY     ║ ANALYST                                             ║
║ CAN           ║ - Read goal, deadline, constraint from $ARGUMENTS   ║
║               ║ - Read ai/STATUS.md for open tasks                  ║
║               ║ - Split work: HUMAN NOW / CLAUDE NEXT / TOGETHER    ║
║               ║ - Output day-by-day ownership plan                  ║
║ CANNOT        ║ - Write code or modify source files                 ║
║               ║ - Make decisions without human confirmation         ║
║ REQUIRES      ║ - Goal description                                  ║
║               ║ - Deadline (days or date)                           ║
║               ║ - Constraint (token %, time, team size)             ║
║ OUTPUTS       ║ - HUMAN NOW list (zero Claude needed)               ║
║               ║ - CLAUDE NEXT list (save tokens for these)          ║
║               ║ - TOGETHER list (needs both, schedule accordingly)  ║
║               ║ - Day-by-day plan with clear ownership              ║
╚═══════════════╩══════════════════════════════════════════════════════╝

When Claude limits are low, time is short, or team bandwidth is split —
this skill divides the work so humans and Cortex operate in parallel,
not sequentially. Human does what needs no AI. Claude does what needs AI.
Neither waits for the other.

$ARGUMENTS
Parse from $ARGUMENTS:
  goal        → what needs to be done (e.g. "deploy Exena to production")
  deadline    → when (e.g. "2 days", "Wednesday", "2026-03-18")
  constraint  → limiting factor (e.g. "Claude 90% weekly used", "solo dev", "2 hours/day")
  context     → optional extra info

If any of the 3 required fields are missing, ask for them before proceeding.

---

## STEP 1 — Understand the Goal

Read $ARGUMENTS. Extract:
- What is the end state? (deployed app / shipped feature / fixed bug / launched campaign)
- What is the hard deadline?
- What is the constraint? (token budget / time / people / external dependencies)

Read `ai/STATUS.md` if it exists — surface any open blockers relevant to the goal.

---

## STEP 2 — Decompose the Work

Break the goal into atomic tasks. For each task, classify:

```
HUMAN ONLY    → no AI reasoning needed
               Examples: create account, fill env vars, buy domain,
               configure DNS, click buttons in a dashboard, gather keys,
               read documentation, run a script that already exists,
               wait for email verification, approve a form

CLAUDE ONLY   → needs AI reasoning, code generation, or diagnosis
               Examples: write config files, debug errors, write migrations,
               review architecture, generate missing code, run cert-* skills

TOGETHER      → needs human action + Claude guidance in the same sitting
               Examples: deploy + fix errors as they appear,
               run cert-prelaunch + fix what it flags,
               first production test + triage failures

EXTERNAL WAIT → depends on a third party (DNS propagation, API approval,
               bank verification, account review)
               → schedule around these, not against them
```

---

## STEP 3 — Apply the Constraint

Given the constraint, reorder and group tasks:

**If constraint = token/usage limit:**
```
Rule 1: Move all HUMAN ONLY tasks to NOW (do while Claude is unavailable)
Rule 2: Batch all CLAUDE ONLY tasks for when limits reset
Rule 3: TOGETHER tasks go last — need both available simultaneously
Rule 4: EXTERNAL WAIT tasks → start immediately regardless (they run in background)
```

**If constraint = time (solo dev, limited hours):**
```
Rule 1: Parallelize HUMAN ONLY + EXTERNAL WAIT — run simultaneously
Rule 2: Claude tasks = highest leverage per hour, prioritize these
Rule 3: Cut TOGETHER tasks to minimum — most expensive in combined attention
```

**If constraint = team (multiple people):**
```
Rule 1: Assign HUMAN ONLY tasks across team members
Rule 2: One person is "Claude owner" — runs Cortex sessions
Rule 3: Others unblock externals, set up infra, gather credentials
```

---

## STEP 4 — Output the Plan

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CERT HANDOFF PLAN
Goal:        [goal]
Deadline:    [deadline]
Constraint:  [constraint]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HUMAN NOW — do these without Claude (0 tokens)
────────────────────────────────────────────────
  □ [task]   ~[time estimate]   [why no Claude needed]
  □ [task]   ~[time estimate]
  □ [task]   ~[time estimate]

EXTERNAL WAIT — start these immediately, they run in background
────────────────────────────────────────────────
  □ [task]   [expected wait time]   [what you're waiting for]
  □ [task]   [expected wait time]

CLAUDE NEXT — save tokens for these (schedule for [when constraint lifts])
────────────────────────────────────────────────
  □ [task]   [which cert-* skill to use]
  □ [task]   [which cert-* skill to use]

TOGETHER — needs human + Claude in same session
────────────────────────────────────────────────
  □ [task]   [what human does] + [what Claude does]
  □ [task]   [what human does] + [what Claude does]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAY-BY-DAY OWNERSHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[DAY 1 — date]
  Human:  [task list]
  Claude: [UNAVAILABLE — saving for Day N] or [task list]
  Wait:   [externals running in background]

[DAY 2 — date]
  Human:  [task list]
  Claude: [task list if limits allow] or [UNAVAILABLE]
  Wait:   [check external status]

[DAY N — limits reset / deadline]
  Human:  [standby — ready to action Claude outputs]
  Claude: [cert-prelaunch → cert-fix → cert-commit → deploy]
  Goal:   [end state]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOKEN BUDGET FOR CLAUDE SESSIONS
  Remaining now:  [X%]
  Resets:         [date/time]
  Recommended:    Save for [top 2-3 Claude tasks] — highest leverage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 5 — Flag Risks

After the plan, flag anything that could collapse the deadline:

```
⚠ RISKS
  · [External dependency] — if [service] takes longer than [X days],
    [task] gets delayed. Mitigation: [start today / have backup]
  · [Token risk] — if more bugs appear than expected at deploy,
    remaining 10% may not cover. Mitigation: [do cert-prelaunch manually
    using DEV-TEST-GUIDE.md before Claude session]
  · [Single point of failure] — [task] blocks everything after it.
    Start this first.
```

---

## Completion Block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:       cert-handoff-plan
STATUS:      COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal:        [goal]
Deadline:    [deadline]
Human tasks: [N] — startable now, no Claude needed
Claude tasks:[N] — save tokens, schedule for [date]
Risks:       [N] flagged
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT:        Start HUMAN NOW list immediately
             Set reminder for [limits reset date/time]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
