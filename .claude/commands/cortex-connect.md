╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-connect  |  v10.0  |  TIER: 0  |  BUDGET: LEAN   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L0 (Orchestration)                                  ║
║ AUTHORITY     ║ READ-ONLY — loads state, never modifies             ║
║ WHEN TO RUN   ║ First thing at every session start                  ║
║ OUTPUTS       ║ Session brief: score · tasks · blueprints           ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Connect to the Cortex Orchestrator and load current state.
Run this at the start of every session to know what's pending.

---

## Step 0 — Verify project isolation (Law 8)

Before doing anything else, confirm this project obeys Law 8.

```bash
# 1. ai/ and .claude/ must be gitignored
grep -q "^ai/" .gitignore && grep -q "^\.claude/" .gitignore \
  && echo "✅ Isolation: PASS" || echo "⚠️  Isolation: FAIL — add ai/ and .claude/ to .gitignore"

# 2. No cross-project path references in tracked files (quick scan)
git ls-files | xargs grep -l "\.\./[a-z]" 2>/dev/null | head -5
```

If isolation fails:
```
⚠️  LAW 8 VIOLATION — Project Isolation
    This project is missing ai/ or .claude/ in .gitignore.
    CORTEX governance files will leak to remote if committed.
    Fix: echo "ai/" >> .gitignore && echo ".claude/" >> .gitignore
    Ref: C:\luv\Cortex\core\SYSTEM_LAWS.md — Law 8
```

Proceed regardless — isolation check is a warning, not a session blocker.

---

## Step 1 — Check if orchestrator is running

```bash
curl -sf http://127.0.0.1:7391/health
```

If it fails (not running):
```
⚫ Cortex Orchestrator offline.
   To start: cortex-server start --bg
   Continuing with local context only (MEMORY.md + STATUS.md).
```

Proceed with the session using local memory files.
Do NOT block on this — orchestrator is optional enhancement.

---

## Step 2 — Load status snapshot

```bash
curl -sf http://127.0.0.1:7391/status
```

Parse response and render the SESSION BRIEF:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX SESSION BRIEF — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score:     [score]/100  [ALLOW ✅ | WARN ⚠️ | BLOCK 🚫]

Pending tasks ([count]):
  [priority-icon] [task.title]  ([task.phase])
  ...

Active blueprints:
  [bp.name] ([bp.appType]) — [bp.status]
  ...

Last session:
  [session.summary or "(no summary)"]
  [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Priority icons: 🔴 1-2 (critical) · 🟡 3-5 (normal) · 🟢 6-9 (low)

---

## Step 3 — Start a session record

```bash
curl -sf -X POST http://127.0.0.1:7391/sessions/start \
  -H "Content-Type: application/json" \
  -d '{"type": "claude"}'
```

Save the returned session `id` — you'll need it for `/cortex-sync`.

```
SESSION ID: sess_[xxx]  (keep this for /cortex-sync at end)
```

---

## Step 4 — Route the user's task

After displaying the brief, ask:

```
What are you working on today?
```

Route based on answer:

| Answer mentions | Route to |
|----------------|---------|
| new project / idea | `/cortex-blueprint` |
| bug / broken / fix | `/cert-fix` |
| new feature / add | `/cert-plan` → `/cert-build` |
| review / check | `/cert-review` |
| deploy / launch | `/cert-deploy` |
| score / audit | `/cert-verify` |
| just a question | Answer directly |

---

## If score is BLOCK (< 95):

```
⛔ SCORE BELOW THRESHOLD — [score]/100
   No new features until score recovers.

   Blockers:
   [list blockers from status]

   Run /cert-verify to see full detail.
   Fix blockers first, then continue.
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-connect                             COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Orchestrator    [CONNECTED | OFFLINE — local mode]
Score           [score]/100  [decision]
Tasks           [N] pending
Session         [sess_id]
Next            Tell me what you're working on
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
