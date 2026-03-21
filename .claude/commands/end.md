╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /end  |  v1.0  |  TIER: 1  |  BUDGET: LEAN               ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ REPLACES      ║ /cert-end · /cortex-end (both deprecated)           ║
║ AUTHORITY     ║ OBSERVER                                             ║
║ CAN           ║ - Sync session state to orchestrator               ║
║               ║ - Append TRACKER entry                             ║
║               ║ - Log SESSION_END lifecycle event                  ║
║               ║ - End lifecycle trace                              ║
║               ║ - Surface next session primer                      ║
║ CANNOT        ║ - Write code · Modify source files                 ║
║               ║ - Run git operations                               ║
║ WHEN TO RUN   ║ - Last command of every session                    ║
║               ║ - Before closing Claude Code                       ║
║ PAIRED WITH   ║ /start — run at session open                      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/end — One command to close any session on any project.

The symmetrical pair to /start. Syncs everything, logs the session,
surfaces exactly where to start next time. Always the same.

---

## STEP 1 — Collect Session Facts

**What was done this session:**
From conversation context — list commits made, features touched, bugs fixed.
If unsure, run:
```bash
git log --oneline --since="8 hours ago"
```

**Files changed:**
```bash
git diff --name-only HEAD~3..HEAD 2>/dev/null | head -20
```

**Open state:**
Read `ai/state/session-state.json` → active_role, pending_pa_reviews.
Read `ai/state/open-issues.json` → count of open issues (if exists).

---

## STEP 2 — Sync to Orchestrator

```bash
curl -s -X POST http://localhost:7391/sessions/start \
  -H "Content-Type: application/json" \
  -d '{
    "project": "[project name]",
    "summary": "[one-line: what was done]",
    "commits": [N],
    "filesChanged": [N]
  }' --max-time 3
```

If orchestrator offline → skip silently. State already saved locally.

---

## STEP 3 — Append TRACKER

Append one line to `ai/tracker/CORTEX-TRACKER.md` OR `ai/TRACKER.md` (whichever exists):

```
[YYYY-MM-DD] — [what was done] — [N commits] — next: [next action]
```

Keep it one line. Terse. Future sessions read only the last entry.

---

## STEP 4 — Log SESSION_END

```bash
node scripts/lifecycle.js log --action=SESSION_END --module=cortex \
  --detail="[summary] · commits=[N] · files=[N]"

node scripts/lifecycle.js trace end
```

If `scripts/lifecycle.js` not found → skip silently.

---

## STEP 5 — Output Close Brief (always same format)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Session closed          [YYYY-MM-DD]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Done        [what was accomplished — 1 line]
Commits     [N] · [last commit hash + message]
Score       [X]/100 · [unchanged | ▲ improved | ▼ dropped]
Synced      [✅ orchestrator | ⚠️ local only]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next session → /start
Pick up at  : [next action from STATUS.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Rules for the brief:
- "Done" = one sentence. What changed. Not how.
- "Pick up at" = the exact thing to do first next session.
- If uncommitted changes exist → add: `⚠️ Uncommitted changes — run /cert-commit before closing`
- If score dropped this session → add: `⚠️ Score dropped [from] → [to] — run /cert-score before next session`
- If pending PA reviews → add: `⚠️ [N] pending approvals — review before next session`

---

## Uncommitted Work Guard

Before outputting the close brief, check:
```bash
git status --short
```

If modified files exist:
```
⚠️ You have uncommitted changes:
   [list files]

Commit now? → /cert-commit
Skip and close anyway? → type CLOSE
```

Wait for response. Do not close without acknowledging uncommitted work.

---

## What Gets Deprecated

`/cert-end` and `/cortex-end` are deprecated as of v11.2.
`/end` is the single replacement for both.

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Closed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Synced  : [✅ | ⚠️ local]
Logged  : SESSION_END · [date]
Next    : /start → [project]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
