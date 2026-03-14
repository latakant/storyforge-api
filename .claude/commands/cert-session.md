╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cert-session  |  v3.0  |  TIER: 1  |  BUDGET: LEAN       ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 (Intent) + L9 (Feedback)                         ║
║ AUTHORITY     ║ ORCHESTRATOR                                         ║
║ CAN           ║ - Scan own skills, agents, rules, adapters           ║
║               ║ - Read project context files                         ║
║               ║ - Produce oriented session brief + capability map    ║
║ CANNOT        ║ - Write code · Modify project files                  ║
║               ║ - Skip Step 1 (self-inventory is mandatory)          ║
║ WHEN TO RUN   ║ - First command of every session, no exceptions      ║
║ OUTPUTS       ║ - Capability map · Project state · Session brief     ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/cert-session v3.0 — AI self-orientation before any work begins.

The v3.0 principle:
  Before asking what to do, understand what you CAN do and what you already KNOW.
  An AI that knows its own capabilities makes better decisions, routes tasks correctly,
  and never says "I'm not sure if I can do that" when the skill already exists.

  Unknown territory = learning opportunity, never a blocker.
  Every session can add to what CORTEX knows — via cert-learn at session end.

Execution order: self-inventory FIRST → project state SECOND → brief output.

WHERE THIS FILE LIVES
─────────────────────────────────────────────────────────────────────────
Source (one truth):   C:\luv\Cortex\skills\cert-session.md
Installed per project: [project]/.claude/commands/cert-session.md

The skill is universal (defined once in Cortex).
The execution is project-specific (reads THIS project's files when it runs).
Update the skill here → propagate with: cp skills/cert-session.md [project]/.claude/commands/
─────────────────────────────────────────────────────────────────────────

---

## STEP 1 — SELF-INVENTORY
## "Think about what I have before I start working"

Run this before reading any project files.
Scan directory listings only — do not read file contents yet.

### 1A — What skills do I have?

Scan `.claude/commands/` — list all .md files.
Group them mentally:

```
ENTRY POINTS   cortex-plan · cortex-intent · cortex-blueprint · cortex-design
SESSION        cert-session · cert-init · cert-help · cert-status · cert-end
BUILD          cert-build · cert-scaffold · cert-feature · cert-assign
DEV-BACKEND    dev-backend-endpoint · dev-backend-schema · dev-backend-auth
               dev-backend-queue · dev-backend-test · dev-backend-debug
DEV-FRONTEND   dev-frontend-page · dev-frontend-component · dev-frontend-service
               dev-frontend-form · dev-frontend-table · dev-frontend-search
DEV-SHARED     dev-tdd · dev-tdd-constraint · dev-e2e · dev-fullstack-feature
               dev-debugger · dev-tester · dev-fullstack-debug
QUALITY        cert-verify · cert-review · cert-health · cert-hotfix · cert-audit
               cert-refactor · cert-perf · cert-security · cert-certify
GOVERNANCE     cert-commit · cert-rollback · cert-stuck · cert-lifecycle · cert-score
               cert-learn · cert-report · cert-parallel · cert-compact · cert-orchestrate
DEVOPS         cert-env · cert-secrets · cert-migrate · cert-index · cert-changelog
               cert-deploy · cert-infra · cert-runtime · cert-prelaunch
DOCS           cert-docs · cert-swagger · cert-handoff
INTELLIGENCE   cert-predict · cert-pattern · cert-clean · cert-stocktake
               cert-checkpoint · cert-eval
ADAPTERS       (domain-specific — check 1C)
```

Note which groups are present. Flag any group entirely missing.

### 1B — What agents can I call?

Scan `.claude/agents/`:

```
architect.md         → Opus  · READ-ONLY  · architecture decisions (ADR format)
planner.md           → Opus  · READ-ONLY  · phased plans + approval gate
tdd-guide.md         → Sonnet · READ-WRITE · Red→Green→Refactor cycle
code-reviewer.md     → Sonnet · READ-ONLY  · confidence-filtered (>80%) APPROVE/WARN/BLOCK
security-reviewer.md → Sonnet · READ-ONLY  · OWASP + project-specific rules
```

Note which are installed. Flag any missing.

### 1C — What domain laws apply here?

Scan `.claude/commands/` for adapter files:

```
Domains (adapters/domains/):
  E-Commerce:   ecom-orders · ecom-payments · ecom-cart · ecom-inventory
                ecom-coupons · ecom-delivery · ecom-reviews · ecom-tax · ecom-notifications
  SaaS:         saas-subscriptions · saas-organizations
  Booking:      booking-core
  FinTech:      fintech-ledger
  Ride-Hailing: ride-hailing-core
  CMS:          cms-content
  Ops/Workflow: ops-workflow-core
  Shared:       dev-tdd · dev-e2e · dev-debugger · dev-fullstack-feature · dev-fullstack-debug

Stack (adapters/typescript/ · adapters/go/ · adapters/java/ · adapters/dart/):
  TypeScript:   nestjs-patterns · prisma-patterns · nextjs-patterns
                react-native-patterns · express-patterns
  Go:           go-patterns (gin)
  Java:         springboot-patterns
  Dart:         flutter-patterns
```

These adapters = domain laws I will enforce automatically, without being asked.
Missing adapter for a domain this project uses = flag it as a gap.

### 1D — What rules govern my code?

Scan `.claude/rules/`:

```
common/coding-style.md         → immutability, 800-line max, early returns
common/security.md             → HMAC, no secrets, pre-commit checklist
common/testing.md              → 80% minimum, TDD mandatory, 100% for financial/auth
common/development-workflow.md → research-first, agent pipeline
typescript/coding-style.md     → no `any`, explicit return types
typescript/patterns.md         → DTO validation, Prisma errors, Decimal money
```

### 1E — What does CORTEX already know?

Check existence + size (do NOT read fully):

```
ai/learning/instincts.json          → graduated instincts (confidence ≥ 0.8)
ai/learning/pending-patterns.json   → patterns waiting for promotion
ai/knowledge/decisions/             → architectural decisions logged (count files)
ai/knowledge/failures/              → engineering failures logged (count files)
ai/metrics/cortex-metrics.json      → health metrics snapshot
```

If instincts.json exists: count entries with `confidence >= 0.8` → things I know well.
If pending-patterns.json exists: count entries with `promoted: false` → things still learning.
If ai/knowledge/ exists: count decision + failure files → architectural memory depth.
If ai/metrics/cortex-metrics.json exists: read `score.current` + `score.trend` + `bugs.known_pattern_match_rate`.

Check orchestrator: `GET http://localhost:7391/health` (2s timeout)
- If online  → note "Orchestrator ✅ — cross-session memory active"
- If offline → note "⚠️ Orchestrator offline — run /cortex-server start (npm run cortex-server)"

If metrics show anomalies (score drop, low match rate, pending patterns > 5):
→ Output one-line warning: "⚠️ Observability alert: [anomaly]. Run /cortex-observe for details."

### 1F — What contexts can I operate in?

Scan `.claude/contexts/`:

```
dev.md       → code-first, working > perfect (default posture)
review.md    → severity-first, read-only, >80% confidence filter
research.md  → read widely before acting, cite file:line evidence
```

---

## STEP 2 — PROJECT STATE

Now read the project. Load on demand — not everything upfront.

### 2A — Freshness check (always first)

```bash
git log -1 --format="%ar" -- ai/STATUS.md
```

- ≤ 3 days  → proceed silently
- > 3 days  → warn: `⚠️ STATUS.md is [age] old — treating as approximate`
- > 7 days  → halt: `🚨 STATUS.md STALE. Type PROCEED to continue or run /cert-report first.`
  Wait for user input before continuing.

### 2B — Always load

- `ai/STATUS.md` — score · decision · open blockers · next action
- `ai/memory/INVARIANT_MEMORY.md` — Quick Reference block ONLY (~25 lines at top)
  This tells you what causes HARD HALT before you write one line.
- `ai/state/session-state.json` — last role · pending PA reviews · last handoff

### 2C — Load if exists

- `ai/TRACKER.md` — last 5 entries only (skip older history)
- `ai/lifecycle/LAYER_LOG.md` — last 5 entries; count violations in past 7 days

### 2D — Keyword-triggered (load when first message arrives)

| Signal in first message           | Load                                          |
|-----------------------------------|-----------------------------------------------|
| payment · order · webhook · HMAC  | TRANSACTION_MEMORY.md + ecom-payments         |
| auth · otp · jwt · guard · roles  | auth domain skill (if exists)                 |
| schema · migration · prisma       | schema.prisma + prisma-patterns               |
| frontend · component · page · UI  | nextjs-patterns                               |
| queue · bullmq · email · notif    | notification domain skill                     |
| new module · new service · import | DEPENDENCY_MEMORY.md + ARCHITECTURE_MEMORY.md |
| bug · broken · failing · error    | load after identifying layer from message     |
| subscription · billing · plan     | saas-subscriptions adapter                    |
| booking · slot · availability     | booking-core adapter                          |

---

## STEP 3 — CAPABILITY ASSESSMENT

From Step 1 + Step 2, form a clear picture. This is internal — use it to decide how to help.

```
WHAT I CAN DO IN THIS PROJECT
─────────────────────────────────────────────────────────────────────────
Skills:       [N total] — [list groups present: Entry/Session/Build/Dev/Quality/DevOps/...]
Agents:       [N] — [architect · planner · tdd-guide · code-reviewer · security-reviewer — ✓/✗]
Adapters:     [list domain adapters found — these are my active domain laws]
Rules:        [common/ ✓/✗] [typescript/ ✓/✗]
Contexts:     [dev ✓/✗] [review ✓/✗] [research ✓/✗]
Instincts:    [N graduated] — things I know well and apply automatically
Pending:      [N patterns] — things still learning, will capture at session end

GAPS (missing for this project type)
─────────────────────────────────────────────────────────────────────────
[list any adapter/agent/skill group missing that the project likely needs]
[or: "none detected"]

LEARNING POSTURE FOR THIS SESSION
─────────────────────────────────────────────────────────────────────────
· Apply [adapter list] laws automatically — no reminders needed
· Unknown request = engage + learn, never refuse
· Novel patterns found → flag for cert-learn at session end
· Missing adapter for a domain → note it, propose creation if needed
```

---

## STEP 4 — SESSION BRIEF OUTPUT

Output this complete brief. Every field is required.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX SESSION — [YYYY-MM-DD]
Project: [name from package.json or CLAUDE.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAPABILITY MAP
─────────────────────────────────────────────────────────────
Skills      [N] installed
            ✓ Entry: cortex-plan · cortex-intent · cortex-blueprint · cortex-design
            ✓ Dev:   backend · frontend · shared tools
            ✓ Quality: verify · review · security · health
            [✗ Missing: list any group entirely absent]

Agents      [✓ architect] [✓ planner] [✓ tdd-guide] [✓ reviewer] [✓ security]
            [✗ missing: list if any]

Adapters    [list each — these laws are now ACTIVE]
            Example:
              ecom-orders:    7-state machine · $tx on every transition
              ecom-payments:  HMAC-SHA256 required · idempotency enforced
              nestjs-patterns: controller→service→prisma layering mandatory
              [or: "none — generic stack only"]

Rules       [✓ common/] [✓ typescript/] [✗ missing: list if any]

Contexts    [✓ dev] [✓ review] [✓ research]

Knowledge   [N] graduated instincts · [N] pending patterns
            [N] decisions logged · [N] failures documented

Gaps        [list — or "none detected"]

PROJECT STATE
─────────────────────────────────────────────────────────────
Score         [X]/100  |  [ALLOW ≥95 | WATCH ≥85 | BLOCK <85]
Blockers      [None — or list]
Last session  [one-line from TRACKER.md]
Layer issues  [N violations last 7 days · Most violated: [layer] — or "none"]
Pending PA    [N reviews — or "none"]
Next action   [from STATUS.md]
STATUS age    [X days — OK | ⚠️ getting old | 🚨 stale]

OBSERVABILITY
─────────────────────────────────────────────────────────────
Score trend   [▲ improving | → stable | ▼ degrading]
Pattern match [N]% of bugs resolved by known patterns
Anomalies     [None | list — e.g. "score drop", "low match rate"]
Task graph    [active feature: N/total done | none]
→ Full details: /cortex-observe snapshot

SCORE GATE
─────────────────────────────────────────────────────────────
[ALLOW]  ≥ 95 — all work permitted, new features included
[WATCH]  ≥ 85 — bug fixes + tests only, no new features
[BLOCK]  < 85 — no code changes until score recovers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
I know what I have. I know this project's laws. Ready.

START HERE — pick one:
───────────────────────────────────────────────────────────
  1  Not sure where to start?
     → /cortex-intent "describe what you want"
        Routes any request to the right skill chain.

  2  Starting a new feature or project?
     → /cortex-plan new "idea"        new project (Mode A/B/C)
     → /cortex-plan task "feature"    new task (UI/UX check first)

  3  Resuming a feature from last session?
     → /cortex-task-graph status      see what's done + what's next
     → /cert-parallel graph           run next ready nodes

  4  Something is broken?
     → /cortex-observe debug "symptom"   query logs + patterns first
     → /cert-bug "description"           then fix

  5  Checking system health?
     → /cortex-observe snapshot       logs + metrics + anomalies
     → /cortex-server start           if orchestrator offline

───────────────────────────────────────────────────────────
  Full skill catalogue (117 skills): /cert-help
  Architectural history:             /cortex-decision list
  Shared pattern library:            /cortex-patterns stats
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 5 — LOG SESSION START

```bash
node scripts/lifecycle.js log --action=INSIGHT --module=cortex \
  --detail="SESSION_START v3.0: score=[X/100] decision=[ALLOW/BLOCK] \
  skills=[N] agents=[N] adapters=[comma-list] instincts=[N] gaps=[list or none]"
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS  : READY
Score   : [X]/100 · [ALLOW / WATCH / BLOCK]
Skills  : [N] · Agents [N] · Adapters [N]
Memory  : [N] graduated instincts · [N] pending
Gaps    : [list or "none"]
Logged  : SESSION_START · [date]
Next    : /cortex-plan task "..." or /cortex-intent "..."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If STATUS.md stale >7 days and no PROCEED received:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : HALTED
Reason : STATUS.md STALE ([age]) — data unreliable
Fix    : Type PROCEED to continue with stale data
         OR run /cert-report to refresh first
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
