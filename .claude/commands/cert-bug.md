<!-- Load ai/core/MASTER-v7.3.md before executing this skill -->
Execute the full BUG: protocol from AI-MANUAL.md.

$ARGUMENTS

Steps — execute in strict order, do not skip any:

---

**STEP 1 — Load context**
- Read `ai/context/invariants.md` (L1–L5 business invariants)
- Read `ai/context/forbidden.md` (absolute prohibitions)
- Read `ai/fixes/applied/FIX_LOG.md` — has this area been touched before? Is this a regression?

---

**STEP 2 — Diagnose**
- Run: `node scripts/diagnose.js --summary` (recent pattern activity, last 7 days)
- If requestId is in $ARGUMENTS: run `node scripts/diagnose.js --id=<requestId>`
- If date is in $ARGUMENTS: add `--date=YYYY-MM-DD`
- Note: KNOWN (30s resolution) or UNKNOWN (requires investigation)?

---

**STEP 3 — Identify root cause**
- Read the relevant source file(s) for the affected module
- Apply the 8-question enterprise framework:
  1. Money — rupee mutation inside `$transaction`? DB CHECK constraint?
  2. Race conditions — concurrent requests see stale state? Unique constraint as last guard?
  3. Queue — processor re-throws? DLQ exists? Side-effects queued not inlined?
  4. Error mapping — P2002→409, P2025→404? No raw 500s for expected failures?
  5. Security — secrets timing-safe? Rate-limited? Never hardcoded?
  6. Observability — failure logged with context? requestId propagated?
  7. Types — `any` used? Wrong type reaching DB silently?
  8. DB health — index on every FK and high-traffic field?
- Determine path: TRIVIAL (1-3 line, no schema) / FEATURE / ARCH

---

**STEP 4 — Fix**
- Apply the minimal fix only — no cleanup beyond the bug scope
- Never use `any` — use `unknown` + type guards
- Follow: Controller (HTTP only) → Service (business logic) → PrismaService (DB)
- DTOs with class-validator for all new inputs
- Prisma transactions for multi-table mutations

---

**STEP 5 — Verify**
- Run: `npx tsc --noEmit`
- Must pass with 0 errors before continuing. If errors: fix them first.

---

**STEP 6 — Log the fix**
Append to `ai/fixes/applied/FIX_LOG.md`:
```
[YYYY-MM-DD] [module-name] — [what was fixed] — files: [file1.ts, file2.ts]
```

---

**STEP 7 — Update TRACKER**
Append to `ai/TRACKER.md` under today's date:
```
[YYYY-MM-DD] BUG_FIXED — [module] — [one-line description]
```

---

**STEP 8 — Log lifecycle event**
Detect active role from file scope:
- Bug in `exena-api/src/` → BACKEND_DEV
- Bug in `exena-web/src/` → FRONTEND_DEV_WEB
- Bug in `exena-admin/src/` → FRONTEND_DEV_ADMIN
- Bug spanning multiple repos → SENIOR_FULLSTACK

Update `ai/state/session-state.json`: set `active_role` = detected role, `session_date`.

Run: `node scripts/lifecycle.js log --action=BUG_FIXED --module=<module> --detail="<what was fixed>" --role=<ROLE>`

---

**STEP 8.5 — Auto-capture pattern (mandatory — never skip)**

Append to `ai/learning/pending-patterns.json` inside the `"pending"` array:
```json
{
  "captured": "<ISO 8601 timestamp>",
  "bug_id": "<module>-<YYYY-MM-DD>",
  "module": "<affected NestJS module name>",
  "root_cause_category": "validation | auth | db-query | state | config | race-condition | type-mismatch | missing-guard | other",
  "symptom": "<one line: HTTP status + what the error looked like>",
  "fix_pattern": "<one line: what class of fix solved it>",
  "promoted": false
}
```

Output: `PATTERN CAPTURED → pending-patterns.json`
If `pending` array now has > 3 unpromoted entries: output `⚠️ 3+ patterns pending — run /cortex-learn to promote.`

---

**LAYER LOG — append to `ai/lifecycle/LAYER_LOG.md`:**

```
[<ISO timestamp>]
TYPE: FIX
PROJECT: <exena-api|exena-web|exena-admin — from file scope>
ROLE: <active_role from ai/state/session-state.json>
LAYER_ORIGIN: <layer where the bug originated, e.g. L4_SERVICE>
LAYER_FIXED: <layer where the fix was applied>
LAYERS_TOUCHED: <comma-separated, e.g. L3_DTO, L4_SERVICE>
LAYER_VIOLATED: <violation rule name from LAYER_LOG.md quick reference, or NONE>
FRONTEND_IMPACT: <NONE|LOW|MEDIUM|HIGH>
PA_REQUIRED: NO
CONTRACT: UNCHANGED
MODULE: <module>
FILES: <files modified>
SYMPTOM: <one-line: HTTP status + what the error looked like>
ROOT_CAUSE: <one-line: root cause category + description>
FIX_APPLIED: <one-line: what class of fix solved it>
PREVENTION: <one-line: how to prevent this class of bug>
TIER_USED: <Tier1|Tier2|Tier3>
RESOLUTION_TIME: <e.g. 5m|15m|45m>
DETAIL: <one-line description of what was fixed>
```

---

**STEP 9 — Pattern intelligence check**
- Was diagnose.js result KNOWN or UNKNOWN?
- If UNKNOWN: run `node scripts/learn.js analyze`
- If this error class has 2+ occurrences: flag it in `ai/learning/pattern-proposals.md` for promotion
- Run: `node scripts/learn.js health` to check if this module is trending degrading

---

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-bug                     COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files      {n modified}
Pattern    KNOWN: {name} | UNKNOWN → pending-patterns.json | NEW-PROPOSAL
Logged     LAYER_LOG (TYPE: FIX) · {date}
Next       npx tsc --noEmit → /cortex-commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If TypeScript check fails before fix is applied:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-bug                     FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error      TypeScript errors — fix blocked
Cause      {tsc error summary}
Logged     LAYER_LOG (TYPE: ERROR) · {date}
Fix        npx tsc --noEmit → fix all errors → re-run /cortex-bug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
