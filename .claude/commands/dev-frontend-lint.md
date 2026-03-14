<!-- Load ai/core/MASTER-v7.3.md before executing this skill -->
Frontend standards audit. Scans target files against ai/memory/frontend-standards.md. Outputs a scored report. Gate: score < 80 blocks commit.

$ARGUMENTS

Parse: target path (default = files changed in current session). Mode: "strict" (all 7 categories) | "quick" (React Query + states only) | blank = strict.

---

## STEP 1 — Load Standards

Read: `ai/memory/frontend-standards.md`
Hold all 7 category rules in memory before scanning any file.

---

## STEP 2 — Identify Files

If $ARGUMENTS specifies a path → scan that path recursively for `.tsx` and `.ts` files.
If no path specified → identify files changed in the current session via `git diff --name-only` filtered to `exena-web/` and `exena-admin/`.

List all files to be scanned before proceeding.

---

## STEP 3 — Audit Each File Against 7 Categories

For each `.tsx` / `.ts` file:

**1. React Query**
- Every data fetch uses `useQuery` or `useMutation` — no raw `fetch()` or `axios` calls inside components
- Query keys follow `[entity, id?, filter?]` pattern — no magic strings
- `staleTime` set on all `useQuery` calls (no default cache forever)

**2. Service Pattern**
- All API calls live in `services/*.service.ts` → `apiClient` — never inlined in components or pages
- Service functions have explicit TypeScript return types
- No `any` types in service function signatures or return values

**3. Component States (required for every data-fetching component)**
- `isLoading` → renders skeleton or spinner — not null, not blank
- `isError` → renders error message — not null, not blank
- Empty state (`data.length === 0` or `data === undefined`) → renders meaningful empty message

**4. Radix UI Usage**
- Tables use `<Table>` from Radix — not raw `<table>` / `<tr>` / `<td>`
- Dialogs/modals use `<Dialog>` from Radix — not custom modal implementations
- No mixing Radix and non-Radix components for the same UI pattern within one component

**5. Auth Guards**
- Protected pages use `useAuth()` hook — never read token directly from `localStorage` or `document.cookie`
- Admin pages: session checked in layout or middleware, not only client-side on the page component

**6. Named Exports + TypeScript**
- All components use named exports (`export function Foo` or `export const Foo`)
- Exception: Next.js `page.tsx` files may use `export default`
- No `any` types in component props interfaces
- Props interfaces defined above the component (not inline)

**7. Tailwind**
- No inline `style={{}}` unless the value is genuinely dynamic (computed at runtime)
- No hardcoded hex colors (`#3b82f6`) — use Tailwind color tokens only
- No mixing Tailwind classes and CSS modules in the same component

---

## STEP 4 — Score Each Category

Score each category 0–100 per file:
- 100 = zero violations in this category
- Deduct 10 per violation (floor at 0)

File overall score = average of 7 category scores.
Project overall score = average across all scanned files.

---

## STEP 5 — Output Lint Report

```
FRONTEND LINT REPORT — [today's date]
══════════════════════════════════════════════════════
Target:  [path or "session-changed files"]
Files:   [n] scanned   Mode: [strict | quick]

CATEGORY SCORES
──────────────────────────────────────────────────────
React Query:      [score]/100   [✅ | ⚠️ | ❌]
Service pattern:  [score]/100   [✅ | ⚠️ | ❌]
Component states: [score]/100   [✅ | ⚠️ | ❌]
Radix UI:         [score]/100   [✅ | ⚠️ | ❌]
Auth guards:      [score]/100   [✅ | ⚠️ | ❌]
Named exports:    [score]/100   [✅ | ⚠️ | ❌]
Tailwind:         [score]/100   [✅ | ⚠️ | ❌]

OVERALL: [avg]/100

VIOLATIONS (must fix before commit):
  [file]:[approx line] → [rule violated] → [fix suggestion]
  [file]:[approx line] → [rule violated] → [fix suggestion]
══════════════════════════════════════════════════════
```

**Gate decision (output clearly):**
- Score ≥ 90 → `✅ Standards met — proceed with /cortex-commit`
- Score 70–89 → `⚠️ Fix flagged violations, re-run /dev-frontend-lint`
- Score < 70 → `❌ Do not commit — score must reach ≥ 80 minimum`

---

## STEP 6 — Log to Lifecycle (if violations found)

If overall score < 90:
Run: `node scripts/lifecycle.js log --action=INSIGHT --module=frontend --detail="FRONTEND_LINT: score=[score]/100 files=[n] violations=[count] target=[path]"`

Update `ai/learning/skill-usage.json`:
- Increment `invocations.dev-frontend-lint.count` by 1
- Set `invocations.dev-frontend-lint.last` to today's date

---

## Guardrails

- Score < 80 → hard block: never allow commit to proceed
- Never auto-fix violations — report them, let the developer fix them
- If a file doesn't exist at the specified path → skip it, note "file not found" in report
- Re-run after fixes and show the delta: "[before] → [after]"
- "Quick" mode only checks React Query + Component States — still gates at 80
