╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-sprint-end  |  v1.0  |  TIER: 1  |  BUDGET: LEAN  ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ SERVICE       ║ SERVICE 6 — GOVERNANCE (temporal close)             ║
║ AUTHORITY     ║ ANALYST                                              ║
║ CAN           ║ - Read sprint.json + git log for sprint period      ║
║               ║ - Read ai/qa/QA-REPORT-*.md if exists              ║
║               ║ - Generate sprint retrospective                     ║
║               ║ - Generate client delivery report                   ║
║               ║ - Close sprint.json                                 ║
║ CANNOT        ║ - Write code · modify source files                  ║
║ REQUIRES      ║ - /cortex-sprint-start must have run                ║
║ OUTPUTS       ║ - ai/reports/SPRINT-[N]-REPORT-[date].md           ║
║               ║ - Closed ai/state/sprint.json                      ║
║ FEEDS         ║ - cert-report (auto-populates sprint section)       ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Closes a sprint. Produces retrospective + client delivery report.
Run when sprint scope is complete or end date reached.

$ARGUMENTS

---

## STEP 1 — Load sprint state

Read `ai/state/sprint.json`.

If missing or `status: "CLOSED"`:
```
No open sprint found.
Run /cortex-sprint-start to open a new sprint.
```

Extract: sprintNumber, startDate, endDate, scope, completed, deferred, successCriteria.

---

## STEP 2 — Pull git log for sprint period

```bash
git log --oneline --after="[sprint.startDate]" --before="[sprint.endDate or today]" 2>/dev/null
```

Extract: list of commits in this sprint.
Group by: feat · fix · chore · refactor · perf.

Count: features added, bugs fixed, config changes.

---

## STEP 3 — Load QA results (if exist)

Read most recent `ai/reports/QA-REPORT-*.md` for this sprint.

Extract: verdict, test counts, coverage, score.
If no QA report → note "QA report not run — add /cortex-qa-start to workflow."

---

## STEP 4 — Compute sprint metrics

```
Scope:      [N items committed]
Completed:  [N items] ([N]% of scope)
Deferred:   [N items] (moved to next sprint)

Commits:    [N total] — [N feat] · [N fix] · [N chore]
Coverage:   [X]% (from QA report or "not measured")
Score:      [N]/100 (from STATUS.md)
```

Velocity: completed / scope × 100 = [X]%
- ≥ 90% → sprint delivered well
- 70–89% → normal — note what slipped
- < 70% → over-scoped — note why

---

## STEP 5 — Generate sprint retrospective

Structure:

```markdown
## Retrospective — Sprint [N]

### What shipped
[List completed features, one line each, human-readable]

### What slipped
[List deferred items with brief reason]

### Velocity
[X]% — [delivered N of N scoped items]

### Quality
Score: [N]/100 · Tests: [N passing] · Coverage: [X]%

### What went well
[2–3 lines — inferred from git log patterns + score]

### What to improve
[1–2 specific suggestions based on what slipped or failed]
```

Keep it honest. If items slipped, name them. If coverage is low, say so.
This is for the team, not to impress the client.

---

## STEP 6 — Generate client delivery report

Separate from retrospective — client-readable, no internal metrics:

```markdown
# Delivery Report — [project name]
# Sprint [N] · [startDate] → [endDate]

## Delivered this sprint

[For each completed feature:]
- **[Feature name]**: [one-sentence plain-English description of what it does]

## In progress / next sprint

[For each deferred item:]
- [Item name]: [why deferred — honest but professional]

## Project health

Status:  ✅ On track / ⚠️ Minor delays / 🚫 Blocked
Score:   [N]/100 (technical quality)
Tests:   [N] passing — all critical paths verified

## Next milestone

[What Sprint [N+1] will deliver]
Estimated completion: [endDate of next sprint if known]
```

Plain language. No jargon. The client wants to know: did you do what you said?

---

## STEP 7 — Write reports

Write `ai/reports/SPRINT-[N]-REPORT-[date].md` containing both sections:
- Section 1: Sprint retrospective (internal)
- Section 2: Client delivery report (client-facing)

---

## STEP 8 — Close sprint

Update `ai/state/sprint.json`:
```json
{
  "sprintNumber": [N],
  "status": "CLOSED",
  "startDate": "[date]",
  "endDate": "[date]",
  "scope": [...],
  "completed": [...],
  "deferred": [...],
  "closedAt": "[ISO timestamp]",
  "velocity": [X],
  "reportFile": "ai/reports/SPRINT-[N]-REPORT-[date].md"
}
```

Append to `ai/TRACKER.md`:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT [N] CLOSED · velocity: [X]% · score: [N]/100
Delivered: [N features] · Deferred: [N]
Report: ai/reports/SPRINT-[N]-REPORT-[date].md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-sprint-end             COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sprint     [N] CLOSED
Velocity   [X]% · [N] of [N] delivered
Report     ai/reports/SPRINT-[N]-REPORT-[date].md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: /cortex-sprint-start [N+1] | /cert-staging | cert-report
```
