Execute the FIX: protocol — resolving a known issue from the TRACKER or open-issues list.

$ARGUMENTS

FIX: is different from BUG: — the issue is already identified, documented, and has a fix plan.
No diagnosis needed. Go straight to the fix with full context from the tracker.

---

**STEP 1 — Load the issue**
Parse the issue ID from $ARGUMENTS (e.g., ERR-02, TYPE-01, DB-03, QUAL-01).

Read: `ai/state/open-issues.json` — find the issue entry (severity, file, fix instructions)
Read: `ai/STATUS.md` — confirm this issue is still open (not already fixed)
Read: `ai/governance/ENGINEERING_WORKLOAD_PLAN.md` — find the exact code steps if documented

If issue not found in open-issues.json: it may already be fixed. Check `ai/fixes/applied/FIX_LOG.md`.
If already fixed: report the fix date and what was done. Do not re-apply.

---

**STEP 2 — Classify the fix**
From the issue details:
- TRIVIAL (1-3 lines, no schema) → proceed directly
- FEATURE (new logic, new file) → present plan, wait for "OK"
- ARCH (schema change, new module) → present plan, wait for "approved"

---

**STEP 3 — Read the target file**
Read the specific file and line numbers from the issue entry.
Understand the current code before changing it.

---

**STEP 4 — Apply the fix**
Follow the exact fix instructions from `ENGINEERING_WORKLOAD_PLAN.md` if available.
Otherwise:
- No `any` — use `unknown` + type guards
- Minimal change — only what fixes the issue
- No refactoring of surrounding code
- Apply the enterprise 8-question check to confirm the fix doesn't introduce a new issue

---

**STEP 5 — Verify**
- Run: `npx tsc --noEmit` — 0 errors required
- Run: `npx jest --testPathPattern=<module> --passWithNoTests` — tests pass

---

**STEP 6 — Close the issue**

Update `ai/state/open-issues.json` — mark the issue as resolved (remove it or set status=fixed).
Update `ai/STATUS.md` — remove the issue from the open items list.
Append to `ai/fixes/applied/FIX_LOG.md`:
```
[YYYY-MM-DD] [ISSUE-ID] [module] — [what was fixed] — files: [file:line]
```
Run enterprise checker to confirm score improved:
`node scripts/enterprise-checker.js --check`
Update `ai/state/current-score.json` if score changed.

---

**STEP 7 — Update TRACKER**
Append to `ai/TRACKER.md`:
```
[YYYY-MM-DD] FIX [ISSUE-ID] — [module] — [issue description] — CLOSED
```

---

**STEP 8 — Log lifecycle event**
Run: `node scripts/lifecycle.js log --action=BUG_FIXED --module=<module> --detail="[ISSUE-ID] closed: <what was fixed>"`

---

**LAYER LOG — append to `ai/lifecycle/LAYER_LOG.md`:**

```
[<ISO timestamp>]
TYPE: FIX
PROJECT: <exena-api|exena-web|exena-admin>
ROLE: <active_role from ai/state/session-state.json>
LAYER_ORIGIN: <layer where the issue originated>
LAYER_FIXED: <layer where the fix was applied>
LAYERS_TOUCHED: <comma-separated list>
LAYER_VIOLATED: <violation rule name or NONE>
FRONTEND_IMPACT: <NONE|LOW|MEDIUM|HIGH>
PA_REQUIRED: NO
CONTRACT: UNCHANGED
MODULE: <module>
FILES: <files modified>
SYMPTOM: <one-line: HTTP status + what the error looked like>
ROOT_CAUSE: <from open-issues.json or ENGINEERING_WORKLOAD_PLAN.md>
FIX_APPLIED: <one-line: what class of fix solved it>
PREVENTION: <one-line: how to prevent this class of bug>
TIER_USED: N/A
RESOLUTION_TIME: <e.g. 5m|15m|45m>
DETAIL: [ISSUE-ID] closed: <what was fixed>
```

---

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-fix                     COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue      {ISSUE-ID} — {module} — CLOSED
Files      {n modified}
Score      {before} → {after} (or unchanged)
Logged     LAYER_LOG (TYPE: FIX) · {date}
Next       npx tsc --noEmit → /cortex-commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If issue not found or already closed:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-fix                     PARTIAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Done       Issue not found — may already be fixed
Skipped    No code changes made
Issues     Check FIX_LOG.md for prior resolution
Logged     LAYER_LOG · {date}
Next       /cortex-status to verify current score
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
