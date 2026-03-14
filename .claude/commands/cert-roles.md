<!-- Load ai/core/MASTER-v7.3.md and ai/memory/team-roles.md before executing this skill -->
Team roles view, work type analysis, and handoff logging.

$ARGUMENTS

Modes: (no arg) = show current role status | "analyse" = classify incoming work | "log" = recent ROLE_LOG | "handoff" = log a role handoff

---

## On /cortex-roles (no argument)

Read: `ai/ROLE_LOG.md` (last 5 entries)
Read: `ai/state/session-state.json`

Output:

```
CORTEX TEAM ROLES — [today's date]
══════════════════════════════════════════════════════════
Active role:     <from session-state.json or NONE>
Work type:       <from session-state.json or NONE>
Pending PA:      <pending_pa_reviews count> reviews awaiting
Last handoff:    <from session-state.json or NONE>

RECENT ROLE ACTIVITY (last 5 sessions):
  [date] <role> → <action> → <outcome>
  [date] <role> → <action> → <outcome>

Role distribution (this session):
  PA:                  <n> activations
  Senior Fullstack:    <n> activations
  Backend Dev:         <n> activations
  Frontend Dev Web:    <n> activations
  Frontend Dev Admin:  <n> activations

Run /cortex-roles analyse to classify your next task.
══════════════════════════════════════════════════════════
```

---

## On /cortex-roles analyse

Read: `ai/memory/team-roles.md` (Work Type Classification section)
Read the requirement from $ARGUMENTS or ask user to describe the task.

Apply the 4-question classification protocol:
  Q1: Production emergency? → HOTFIX
  Q2: System structure change? → MIGRATION
  Q3: Anything exist already? No → GREENFIELD
  Q4: Behaviour changes? No → REFACTOR / Yes → MAINTENANCE

Output:

```
WORK TYPE ANALYSIS
══════════════════════════════════════════════════════════
Requirement:  <one line description>

Classification: GREENFIELD | MAINTENANCE | REFACTOR | HOTFIX | MIGRATION
Reason:        <one line>

Projects affected:
  exena-api:   YES/NO → <why>
  exena-web:   YES/NO → <why>
  exena-admin: YES/NO → <why>

Roles needed:
  PA:                  YES (Phase <n> trigger) | NO
  Senior Fullstack:    YES → <coordination scope> | NO
  Backend Dev:         YES → <modules> | NO
  Frontend Dev Web:    YES → <pages> | NO
  Frontend Dev Admin:  YES → <pages> | NO

Admin risk elevation: <applies if exena-admin touched — note elevated level>

PA required: YES (Phase <n>) | NO
Suggested next skill: /cortex-feature | /cortex-bug | /dev-backend-context | etc.
══════════════════════════════════════════════════════════
```

Then update `ai/state/session-state.json`:
- Set `active_work_type` to the classified type
- Set `active_role` to the primary role
- Set `session_date` to today
- Add to `role_activations_this_session`

Log to lifecycle:
```
node scripts/lifecycle.js log --action=INSIGHT --module=cortex --detail="WORK_ANALYSIS: type=<type> projects=<list> roles=<list> pa_required=<YES/NO>"
```

---

## On /cortex-roles log

Read: `ai/ROLE_LOG.md`
Show last 10 entries formatted cleanly.

---

## On /cortex-roles handoff

Prompt for (or parse from $ARGUMENTS):
```
FROM role:    <BACKEND_DEV | FRONTEND_DEV_WEB | FRONTEND_DEV_ADMIN | SENIOR_FULLSTACK | PRINCIPAL_ARCHITECT>
TO role:      <same options>
TASK:         <brief task description>
REASON:       <why the handoff is happening>
DELIVERABLE:  <what is being handed off>
STATUS:       COMPLETE | PARTIAL | BLOCKED
NOTES:        <anything the next role needs to know>
```

Append to `ai/ROLE_LOG.md`:
```
[<ISO timestamp>] ROLE_HANDOFF
FROM=<role>
TO=<role>
TASK=<task>
REASON=<reason>
DELIVERABLE=<deliverable>
STATUS=<status>
NOTES=<notes>
```

Update `ai/state/session-state.json`:
- Set `last_handoff` to today's date
- Set `last_handoff_from` and `last_handoff_to`
- Set `active_role` to the TO role

Log to lifecycle:
```
node scripts/lifecycle.js log --action=INSIGHT --module=cortex --detail="ROLE_HANDOFF: <from> → <to> task=<task> status=<status>"
```

Output:
```
HANDOFF LOGGED
══════════════════════════════════════════════
From:         <role>
To:           <role>
Deliverable:  <deliverable>
Status:       <status>
ROLE_LOG:     ✅ appended
Lifecycle:    ✅ logged
session-state: ✅ active_role updated to <to role>
══════════════════════════════════════════════
```

---

## Update skill-usage.json

After any /cortex-roles invocation:
- Increment `invocations.cortex-roles.count` by 1
- Set `invocations.cortex-roles.last` to today's date

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-roles                   COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Work type  {GREENFIELD | MAINTENANCE | MIGRATION | HOTFIX}
Role       {active role}
PA         {YES Phase n | NO}
Logged     ROLE_LOG + LAYER_LOG · {date}
Next       Begin task with work type classification applied
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
