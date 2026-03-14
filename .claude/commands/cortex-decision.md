╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-decision  |  v1.0  |  TIER: 2  |  BUDGET: LEAN   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L7 (Learning) · L0 (Architecture)                   ║
║ AUTHORITY     ║ ARCHITECT                                            ║
║ CAN           ║ - Log an architectural decision to DKB              ║
║               ║ - Query past decisions by domain/type               ║
║               ║ - Log an engineering failure + lesson               ║
║               ║ - Show decision history for current project         ║
║ CANNOT        ║ - Override a decision automatically                 ║
║               ║ - Delete decisions (immutable record)               ║
║ WHEN TO RUN   ║ - After /cortex-blueprint makes a major choice      ║
║               ║ - When a tech stack decision is finalized           ║
║               ║ - When an architectural approach fails              ║
║               ║ - Before /cortex-blueprint (query mode)            ║
║ OUTPUTS       ║ - ai/knowledge/decisions/[id].md · failure log      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/cortex-decision — the Decision Knowledge Base (DKB).

The problem it solves:
  Cortex generates architecture but never records WHY.
  Next project: same domain, same trade-offs, reasoned from scratch.
  With DKB: past decisions inform current architecture.
  "We chose Redis over Memcached last time because X — still valid?"

$ARGUMENTS

Parse from $ARGUMENTS:
- `log` — log a new decision (interactive, asks structured questions)
- `log --decision "<title>" --domain <domain> --chosen <option> --reason "<why>"` — fast log
- `failure "<title>"` — log an architectural failure + lesson learned
- `query <domain>` — show all decisions for a domain (e.g. "auth", "payments", "queue")
- `query --type <type>` — filter by type (auth · database · queue · caching · api · deployment)
- `list` — show all decisions (most recent first)
- `check "<context>"` — given a current design problem, find relevant past decisions

---

## KNOWLEDGE STRUCTURE

Decisions live in `ai/knowledge/decisions/`.
Failures live in `ai/knowledge/failures/`.

```
ai/
  knowledge/
    decisions/          ← architectural decisions + reasoning
      [id]-[title].md
    failures/           ← what didn't work + lessons
      [id]-[title].md
    README.md           ← index of all entries
```

---

## DECISION TEMPLATE

Each decision file follows this structure:

```markdown
---
id: [auto-generated: YYYYMMDD-NNN]
type: auth | database | queue | caching | api | deployment | architecture | other
domain: [which domain this applies to: orders, payments, auth, etc.]
project: [project name]
date: [ISO date]
status: active | superseded | deprecated
---

# Decision: [title]

## Problem
[What specific problem was being solved]

## Options Considered
| Option | Pros | Cons |
|--------|------|------|
| [A]    | ...  | ...  |
| [B]    | ...  | ...  |
| [C]    | ...  | ...  |

## Chosen
**[Option chosen]**

## Why
[The reasoning — what made this the right choice for this context]

## Trade-offs Accepted
[What was consciously given up by choosing this]

## Context / Constraints
[Team size, timeline, scale, existing stack — what shaped this decision]

## Outcome
[Leave blank until outcome is known — fill in after 30+ days in production]
[PENDING | SUCCESS | PARTIAL | FAILURE]

## Lesson
[What future Cortex should take from this — the extractable rule]
```

---

## FAILURE TEMPLATE

```markdown
---
id: [auto-generated: YYYYMMDD-F-NNN]
type: architecture | process | tooling | scope | other
domain: [domain]
project: [project]
date: [ISO date]
severity: HIGH | MED | LOW
---

# Failure: [title]

## What Was Tried
[The approach that failed]

## Context
[When, team size, stage of project]

## What Went Wrong
[The specific failure mode]

## Root Cause
[Why it failed — the underlying reason, not just symptoms]

## Lesson
[The extractable rule: "Never do X when Y. Instead do Z."]

## Better Approach
[What should have been done instead]
```

---

## STEP 1 — LOG mode

### 1A — Collect decision details

If `--decision` arg is provided: use it directly.
If not: ask these questions one at a time:

```
Q1: What is the decision title? (e.g. "Use Redis for session caching")
Q2: What type? [auth / database / queue / caching / api / deployment / architecture / other]
Q3: What domain does this affect? (e.g. "payments", "all", "notifications")
Q4: What options did you consider? (list them)
Q5: What was chosen?
Q6: Why was this chosen? (the core reasoning)
Q7: What trade-offs did you accept?
Q8: Any context that shaped this? (team size, scale, timeline, constraints)
```

### 1B — Generate ID + filename

Generate ID: `[YYYYMMDD]-[3-digit sequence]`
Filename: `[id]-[kebab-title].md`

### 1C — Write decision file

Write to: `ai/knowledge/decisions/[filename]`

### 1D — Update index

Add entry to `ai/knowledge/README.md`:
```
| [id] | [title] | [type] | [domain] | [date] |
```

### 1E — Output

Happy path:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Log Decision
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Collect decision details
• Interactive Q1–Q8 complete
✓ Details captured

[2/4] Generate ID + filename
→ ID: [YYYYMMDD-NNN]
✓ Filename: [id]-[kebab-title].md

[3/4] Write decision file
→ ai/knowledge/decisions/[filename]
✓ Written

[4/4] Update index
→ ai/knowledge/README.md
✓ Entry added

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : COMPLETE
Next   : /cortex-decision query [domain] — review all decisions in this domain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Failure path — if step 3 (file write) fails:
```
[3/4] Write decision file
→ ai/knowledge/decisions/[filename]
✗ Write failed

[4/4] Update index
• Skipped — no file written

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : FAILED at step 3/4
Reason : Could not write decision file
Fix    : Check directory exists (mkdir -p ai/knowledge/decisions/) and retry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 2 — FAILURE mode

Same as LOG but uses failure template. Severity required.
Write to `ai/knowledge/failures/[id]-[kebab-title].md`.

---

## STEP 3 — QUERY mode

Read all files in `ai/knowledge/decisions/` matching the domain filter.
Output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAST DECISIONS — domain: [domain]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[id]  [title]
  Chosen:   [option]
  Why:      [one-line reason]
  Outcome:  [PENDING | SUCCESS | PARTIAL | FAILURE]
  Lesson:   [extractable rule]
  ─────────────────────────────────────────
[id]  [next decision...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[N] decisions found · [N] failures in this domain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4 — CHECK mode

Given a current design problem, find relevant past decisions:

```
/cortex-decision check "choosing a queue system for notifications"
```

1. Extract keywords from the problem description
2. Search decision files for matching type/domain/keywords
3. Return the 3 most relevant decisions with their lessons
4. Output: "Past decisions suggest: [lesson]. Consider if still valid for current context."

---

## How cortex-blueprint uses this

In Phase 0.5 (before reasoning begins):
```
Check: does ai/knowledge/decisions/ have entries for this domain?
If YES → load relevant decisions, surface their lessons
         "Past decision (2026-01-15): chose JWT over sessions — still valid?"
If NO  → proceed fresh, log decisions discovered during blueprinting
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : COMPLETE
Duration: Xs
Next   : /cortex-blueprint  — decisions inform next architecture
         /cortex-decision query [domain]  — review domain history
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode      [log | failure | query | check]
Logged    [title] → ai/knowledge/decisions/
DKB total [N] decisions · [N] failures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
