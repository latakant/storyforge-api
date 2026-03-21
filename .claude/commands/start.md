╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /start  |  v3.0  |  TIER: 1  |  BUDGET: LEAN             ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ REPLACES      ║ /cert-session · /cortex-session (both deprecated)   ║
║ AUTHORITY     ║ ORCHESTRATOR                                         ║
║ CAN           ║ - Read CORTEX global registry                       ║
║               ║ - Auto-detect project from CWD                      ║
║               ║ - Start orchestrator silently                       ║
║               ║ - Load project context (score, last session, laws)  ║
║               ║ - Show 2-level work menu (Development / Design)     ║
║               ║ - Switch context: backend / frontend / global       ║
║               ║ - Show design status board                          ║
║               ║ - Start lifecycle trace                             ║
║ CANNOT        ║ - Write code · Modify project files                 ║
║ WHEN TO RUN   ║ - First command of every session, no exceptions     ║
║ PAIRED WITH   ║ /end — run at session close                        ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/start — One command to begin any session on any project.
v3.0 adds: global registry awareness + 2-level work menu (Development / Design)

---

## STEP 0 — Cortex Health Token (Cortex framework sessions only)

**Only runs when CWD is the Cortex framework itself** (contains HEALTH.md in root).
Skip entirely when working on any project that uses Cortex — not relevant there.

```bash
# Detect if this is a Cortex framework session
[ -f "HEALTH.md" ] && grep -m1 "^CORTEX-" HEALTH.md 2>/dev/null
```

Read `HEALTH.md`. Check the TOKEN line:

```
CORTEX-HEALTHY-*   → ✅ proceed — framework is stable
CORTEX-DEGRADED-*  → ⚠️ note failing checks — proceed with caution, fix before commit
CORTEX-ALARM-*     → 🚫 stop — fix all failing checks before any other work
```

Check the date in the token:
- ≤ 7 days old → trust it, proceed
- > 7 days old → re-verify all 8 checks in HEALTH.md, update token before proceeding

If HEALTHY + recent:
```
✅ CORTEX HEALTH: HEALTHY · v11.3 · [date] · 8/8 checks
```

If ALARM or DEGRADED: surface the failing checks, apply the ALARM RESPONSE protocol from HEALTH.md.

**Do not invent status.** Read the file. The token is only valid if it was verified.

---

## CORTEX_ROOT Resolution

Before reading any Cortex framework file, resolve the root path:

```bash
# 1. Use environment variable if set
CORTEX_ROOT="${CORTEX_ROOT:-}"
# 2. Walk up from CWD until REGISTRY.json is found
if [ -z "$CORTEX_ROOT" ]; then
  d=$(pwd)
  while [ "$d" != "/" ] && [ "$d" != "." ]; do
    [ -f "$d/REGISTRY.json" ] && CORTEX_ROOT="$d" && break
    d=$(dirname "$d")
  done
fi
# 3. Fallback
CORTEX_ROOT="${CORTEX_ROOT:-$HOME/.cortex}"
```

All paths below use `$CORTEX_ROOT`. Never hardcode `C:/luv/Cortex`.

---

## STEP 1 — Read Global Registry

```bash
cat "$CORTEX_ROOT/REGISTRY.json" 2>/dev/null
```

This tells CORTEX:
- All known projects and their paths
- Each project's CORTEX version, score, last session
- Which repos belong to which product

If registry missing → skip silently, continue with local detection only.

---

## STEP 2 — Detect Current Project

```bash
cat CLAUDE.md 2>/dev/null | head -5
cat package.json 2>/dev/null | grep '"name"' | head -1
```

Match CWD against registry paths to find the current project entry.
If matched → load its registry data (version, score history, repos).
If not matched → auto-detect from CLAUDE.md + add to registry at session end.

---

## STEP 3 — Start Orchestrator (silent)

```bash
curl -s http://localhost:7391/health --max-time 1
```

- Online → note "✅ online"
- Offline → start silently: `cd "$CORTEX_ROOT" && npm run server &`
- Still offline → note "⚠️ offline — local only"

---

## STEP 4 — Load Project Context (lean)

**4A — Score + decision**
Read `ai/STATUS.md` → first 15 lines only.
Extract: score · decision · open blockers · next action.

**4B — Last session**
Read `ai/TRACKER.md` → last entry only. One line.

**4C — Active laws**
Scan `.claude/commands/` for adapter files.

**4D — Session state**
Read `ai/state/session-state.json` → active_role + pending_pa_reviews.

**4E — Staleness check**
```bash
git log -1 --format="%ar" -- ai/STATUS.md
```
- > 3 days → warn · > 7 days → halt until PROCEED

---

## STEP 5 — Output Brief

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — [project name]          [YYYY-MM-DD]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score       [X]/100 · [ALLOW ✅ | WATCH ⚠️ | BLOCK 🚫]
Last        [one-line from TRACKER]
Blockers    [None | list]
Laws        [adapter list]
Next        [from STATUS.md]
Orchestrator [✅ online | ⚠️ offline]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 6 — 2-Level Work Menu (NEW in v3.0)

### Level 1 — What mode?

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What are we working on?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1  Development    write · build · fix · test
2  Design         plan · review · status board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type 1 or 2:
```

---

### Level 2A — Development selected

Detect repos from registry entry for this project.

**Single repo (backend or frontend only):**
```
Context → [BACKEND | FRONTEND] · [project-name]
Laws: [list]
Ready. What are we building?
```
Skip sub-menu — only one option.

**Multi-repo product (api + web):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Development — which layer?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1  Backend     [api-name]     [score]/100 · [decision]
2  Frontend    [web-name]     [score]/100 · [not scored]
3  Global      full app       end-to-end · both layers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type 1, 2, or 3:
```

**Backend selected:**
Load NestJS patterns, Prisma patterns, backend adapters.
Output: `Context → BACKEND · [name] · Laws: nestjs-patterns · prisma-patterns · [domain adapters]`

**Frontend selected:**
Load Next.js patterns, React Query patterns, design system.
Read frontend repo's `ai/STATUS.md` if exists.
Output: `Context → FRONTEND · [name] · Laws: nextjs-patterns · [design tokens loaded]`

**Global selected:**
Load both backend + frontend contexts simultaneously.
Active laws = union of both.
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Context → GLOBAL (end-to-end)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend    [name]   [score]/100 · [decision]
Frontend   [name]   [score]/100 · [decision]
Laws       [combined — both layers active]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use: /dev-e2e               Playwright full-flow tests
     /dev-fullstack-feature feature spanning both layers
     /cert-verify           verify both repos clean
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Level 2B — Design selected

Read `ai/design/STATUS.md` for design task board.
If file missing → show empty board with prompt to create it.

**Design status board:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Design — [project name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Done
   Tailwind config · Button · Card · Input · Alert
   Modal · Sidebar · Navbar

⏳ In Progress
   Login page — 60% complete

📋 Pending
   Customer orders list
   Place order form
   OPS board
   Tailor board
   Admin dashboard

🚫 Blocked
   [none | reason if any]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Options:
1  Continue in-progress work  (Login page)
2  Start next pending item    (Customer orders list)
3  Pick specific item
4  Add new design task
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Design board reads from:** `ai/design/STATUS.md`
**Format of ai/design/STATUS.md:**
```markdown
# Design Status — [project name]
# Updated: [date]

## Done
- Tailwind config
- Button (4 variants)
- Card

## In Progress
- Login page | 60%

## Pending
- Customer orders list
- Place order form
- OPS board

## Blocked
- (none)
```

If `ai/design/STATUS.md` missing:
```
No design board found.
Create one? → /cortex-intent "create design status board"
Or start designing: describe what screen you want to design.
```

---

## STEP 7 — Update Registry

After menu selection, update the project's registry entry:
```bash
# Read REGISTRY.json
# Update: last_session = today, score = current score
# Write back
```

This keeps the registry current without any manual work.

---

## STEP 8 — Start Lifecycle Trace

```bash
node scripts/lifecycle.js trace start
node scripts/lifecycle.js log --action=SESSION_START --module=cortex \
  --detail="project=[name] context=[BACKEND|FRONTEND|GLOBAL|DESIGN] score=[X/100]"
```

If not found → skip silently.

---

## Score Gate

| Score | Behaviour |
|-------|-----------|
| ≥ 95 ALLOW | ✅ all work permitted |
| 85–94 WATCH | ⚠️ bug fixes + tests only |
| < 85 BLOCK | 🚫 fix score first |

---

## Example — tailorgrid full flow

```
You open Claude Code at C:\luv\tailorgrid\
Type: /start

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — tailorgrid              2026-03-18
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score       95/100 · ALLOW ✅  (tailorgrid-api)
Last        Phase 5 complete — E2E tests + deploy config
Blockers    None
Laws        nestjs-patterns · prisma-patterns
Next        Build tailorgrid-web frontend
Orchestrator ✅ online (v11.2.0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What are we working on?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1  Development    write · build · fix · test
2  Design         plan · review · status board
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You: 1

Development — which layer?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1  Backend     tailorgrid-api    95/100 · ALLOW ✅
2  Frontend    tailorgrid-web    not scored yet
3  Global      full app          end-to-end
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You: 2

Context → FRONTEND · tailorgrid-web
Laws: nextjs-patterns · design system loaded
Ready. What are we building?
```

---

## What Gets Deprecated

`/cert-session` and `/cortex-session` deprecated since v11.2. `/start` is the replacement.

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project : [name]
Context : [BACKEND|FRONTEND|GLOBAL|DESIGN]
Score   : [X]/100 · [ALLOW/WATCH/BLOCK]
Registry: [N] projects known
Orch    : [online | offline]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paired with /end — run at session close.
```
