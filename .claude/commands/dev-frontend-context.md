# /dev-frontend-context — Next.js Adapter (Skill: Frontend Context Loader)
# ADAPTER: Requires Next.js App Router + React Query frontend project.
# Load frontend development context for a focused Next.js session.

$ARGUMENTS

Parse: app target from $ARGUMENTS (e.g., "web", "admin", "dashboard").
Optionally: feature name or page route to focus on.

---

**STEP 1 — Confirm target app**

Read `CLAUDE.md` for the project's frontend app config:
- App name, dev port, auth method, token storage key, page count
- If multiple frontends (e.g., storefront + admin): list both and confirm which to load

Default pattern for multi-frontend projects:
| App | Port | Auth | Token key |
|-----|------|------|-----------|
| {web-app} | {port} | {auth-method} | `{token-key}` |
| {admin-app} | {port} | {auth-method} | `{token-key}` |

---

**STEP 2 — Load frontend architecture from CLAUDE.md**
Read `CLAUDE.md` — extract:
- Frontend file structure for the target app
- Tech stack (Next.js version, React version, UI library, state management)
- Any app-specific extras (charts, tables, etc.)

---

**STEP 3 — Load available API contract**
Read `CLAUDE.md` API Contract section — endpoints by module.
Note which are: Public / Auth (Bearer JWT) / Admin (Role required).

---

**STEP 4 — Load known frontend gaps**
Read `ai/STATUS.md` Current Gaps section for the target app.
Note: current score, known gaps, severity.

---

**STEP 5 — Load frontend standards (hold in memory)**
Read `ai/memory/frontend-standards.md` — React Query patterns, component conventions, service patterns.
- If file not found: use CLAUDE.md frontend coding standards section instead. Note: "frontend-standards.md not found — using CLAUDE.md standards. Run /cortex-init to create it."

---

**Output a Frontend Context Brief:**

```
FRONTEND CONTEXT — {app-name} — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
App:       {app-name} (port {port})
Router:    Next.js App Router ('use client' for interactive pages)
State:     React Query (server state) + Context (auth state)
UI:        {ui-library} — from CLAUDE.md
Token:     {token-key} (handled by api-client.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend API: {N} endpoints ready (see CLAUDE.md)
Known gaps:  [list from ai/STATUS.md for this app]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Available dev skills:
  /dev-frontend-page       → add a new Next.js App Router page
  /dev-frontend-component  → build a reusable UI component
  /dev-frontend-service    → add an API service function
  /dev-frontend-debug      → debug frontend issues
```
