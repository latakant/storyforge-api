Create a conventional commit with full CORTEX lifecycle logging.

$ARGUMENTS

---

**STEP 1 — Review all changes**
Run: `git status`
Run: `git diff`
Never use `git add -A` or `git add .` blindly. Review each modified file.

---

**STEP 2 — TypeScript gate (mandatory)**
Run: `npx tsc --noEmit`
If TypeScript errors exist: STOP. Fix errors first. Do not commit broken types.

---

**STEP 3 — Determine conventional commit message**

Map the change to commit type:
- New endpoint / feature → `feat(module): description`
- Bug fix → `fix(module): description`
- Config / tooling / non-code → `chore(scope): description`
- Performance improvement → `perf(module): description`
- Code change, no behaviour change → `refactor(module): description`
- Security fix → `fix(security): description`

If $ARGUMENTS contains a message, use it exactly. Otherwise draft from the diff.
Module name = the NestJS module folder name (e.g., `orders`, `auth`, `payments`).

---

**STEP 4 — Stage selectively**
Stage only the files relevant to this change:
```bash
git add src/modules/<module>/... prisma/... ai/...
```
Never include: `.env`, build artifacts, `node_modules`, `*.log` files.

---

**STEP 5 — Commit**
```bash
git commit -m "feat(orders): description here

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

**STEP 6 — Log lifecycle event**
Map commit type → lifecycle action:

| Commit type | Lifecycle action |
|-------------|-----------------|
| `feat` | `FEATURE_ADDED` |
| `fix` | `BUG_FIXED` |
| `chore` | `CONFIG_CHANGED` |
| `perf` | `PERFORMANCE_FIX` |
| `refactor` | `FEATURE_MODIFIED` |
| `fix(security)` | `SECURITY_PATCH` |

Read `ai/state/session-state.json` → `active_role` (use SENIOR_FULLSTACK if null).

Run: `node scripts/lifecycle.js log --action=<action> --module=<module> --detail="<commit message body>" --role=<active_role>`

---

**STEP 7 — Update TRACKER**
Append to `ai/TRACKER.md`:
```
[YYYY-MM-DD] [commit-hash-short] — [module] — [what changed] — lifecycle: [action]
```

---

**LAYER LOG — append to `ai/lifecycle/LAYER_LOG.md`:**

```
[<ISO timestamp>]
TYPE: COMMIT
PROJECT: <exena-api|exena-web|exena-admin — from staged file paths>
ROLE: <active_role from ai/state/session-state.json>
LAYER_ORIGIN: <primary layer of the committed change>
LAYER_FIXED: <same as LAYER_ORIGIN for commits>
LAYERS_TOUCHED: <comma-separated list of all layers in staged files>
LAYER_VIOLATED: NONE
FRONTEND_IMPACT: <NONE|LOW|MEDIUM|HIGH>
PA_REQUIRED: NO
CONTRACT: <UNCHANGED|NON_BREAKING|BREAKING>
MODULE: <module>
FILES: <staged files>
DETAIL: <commit message one-liner>
```

---

**STEP 8 — Health token check (Cortex framework commits only)**

Only applies when committing to the Cortex framework repo itself (CWD contains `HEALTH.md`).
Skip entirely when committing to any project that uses Cortex.

```bash
[ -f "HEALTH.md" ] && echo "cortex repo — check health token"
```

If this is a Cortex framework commit, ask: do the staged files affect any of these?
- `skills/` — any skill file added, changed, or deleted
- `REGISTRY.json` — project entries changed
- `core/MASTER-*.md` — master spec changed
- `package.json` version field — version bumped
- A health gap opened or closed

If YES to any → remind:
```
⚠️ HEALTH TOKEN — update required
  Staged changes affect Cortex internals.
  Before closing session: update HEALTH.md token.
  Run all 8 checks → set CORTEX-[HEALTHY|DEGRADED|ALARM]-v{version}-{YYYYMMDD}-{N}/8
  See: HEALTH.md → TOKEN UPDATE PROTOCOL
```

If NO → skip silently.

---

## Completion block (MASTER-v11.3.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-commit                  COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Committed  {hash} — {commit message}
Staged     {n files}
Logged     LAYER_LOG (TYPE: COMMIT) · {date}
Next       /cortex-diagram (if topology changed) | next feature
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If TypeScript errors prevent commit:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-commit                  FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error      TypeScript gate failed — commit blocked
Cause      {tsc error summary}
Logged     LAYER_LOG (TYPE: ERROR) · {date}
Fix        npx tsc --noEmit → fix all errors → re-run /cortex-commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
