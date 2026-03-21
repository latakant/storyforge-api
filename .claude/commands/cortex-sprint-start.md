╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-sprint-start  |  v1.0  |  TIER: 1  |  BUDGET: LEAN║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ SERVICE       ║ SERVICE 6 — GOVERNANCE (temporal planning)          ║
║ AUTHORITY     ║ ORCHESTRATOR                                         ║
║ CAN           ║ - Read ai/STATUS.md (what's pending)               ║
║               ║ - Read ai/state/task-graph.json (if exists)        ║
║               ║ - Prompt human for sprint scope                    ║
║               ║ - Create ai/state/sprint.json                      ║
║               ║ - Set sprint duration + goals                      ║
║ CANNOT        ║ - Assign tasks to developers                       ║
║               ║ - Write code or modify source files                ║
║ OUTPUTS       ║ - ai/state/sprint.json                            ║
║               ║ - Sprint header in ai/TRACKER.md                  ║
║ PAIRED WITH   ║ /cortex-sprint-end — run at sprint close           ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Opens a new sprint. Defines scope, duration, and success criteria.
Feeds: cert-report, cortex-qa-report, cortex-sprint-end.

$ARGUMENTS

---

## STEP 1 — Check for existing open sprint

Read `ai/state/sprint.json`.

If file exists and `status: "OPEN"`:
```
⚠️ Sprint [N] is already open.
   Start date: [date] · End date: [date]
   Scope: [N features]

   Close it first → /cortex-sprint-end
   Or override (loses progress tracking)? [yes/no]
```

Wait for human reply. If "yes" → overwrite. If "no" → stop.

If no file or `status: "CLOSED"` → proceed.

---

## STEP 2 — Load pending work

Read `ai/STATUS.md` → extract:
- Current phase/milestone
- Pending items (backlog)
- Score + any known blockers

Read `ai/state/task-graph.json` if exists → extract pending tasks.

Display to human:
```
Available work for this sprint:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[From STATUS.md pending section]
[From task-graph.json if exists]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 3 — Prompt for sprint scope

Ask:
```
Define this sprint:

1. Sprint number? (auto-detect from previous or enter manually)
2. Duration? (default: 2 weeks — enter end date as YYYY-MM-DD)
3. What's in scope? (list features/tasks from above, or describe)
4. Success criteria? (what does "done" look like for this sprint?)
```

Wait for human input. Accept free-form — extract structure from it.

Parse input into:
- sprintNumber: [N]
- startDate: today
- endDate: [human provided or +14 days]
- scope: [list of feature/task names]
- successCriteria: [human description]
- excludedFromThisSprint: [] (items explicitly deferred)

---

## STEP 4 — Confirm and create sprint

Show the sprint summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sprint [N] — [project name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Start:    [YYYY-MM-DD]
End:      [YYYY-MM-DD]  ([N] days)
Scope:    [N items]
  1. [feature]
  2. [feature]
  ...

Done when: [success criteria]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Confirm? [yes/no]
```

Wait. If "no" → return to Step 3.

---

## STEP 5 — Write sprint.json

Write `ai/state/sprint.json`:

```json
{
  "sprintNumber": [N],
  "status": "OPEN",
  "startDate": "[YYYY-MM-DD]",
  "endDate": "[YYYY-MM-DD]",
  "scope": ["feature-A", "feature-B"],
  "completed": [],
  "deferred": [],
  "successCriteria": "[human description]",
  "openedAt": "[ISO timestamp]",
  "closedAt": null
}
```

---

## STEP 6 — Add sprint header to TRACKER

Append to `ai/TRACKER.md`:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT [N] OPEN · [YYYY-MM-DD] → [YYYY-MM-DD]
Scope: [feature list, comma-separated]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-sprint-start           COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sprint     [N] OPEN
Dates      [start] → [end]
Scope      [N items]
State      ai/state/sprint.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paired with /cortex-sprint-end — run when sprint closes.
```
