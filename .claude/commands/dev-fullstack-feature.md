Build a complete feature end-to-end: backend API → frontend UI.

$ARGUMENTS

Description of the complete feature (e.g., "product reviews: display list + create form on product page").

The API is always built first. Never build frontend before the backend is working and verified.

---

**STEP 1 — Define complete scope (output before writing any code)**

```
FEATURE SCOPE — [name] — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND (exena-api):
  Module:     [NestJS module]
  Endpoints:  [METHOD /api/path — auth level]
  DB change:  [yes → ARCH path | no]
  New model:  [yes/no]

FRONTEND ([exena-web / exena-admin / both]):
  Pages:      [list route paths]
  Components: [list new components needed]
  Service fn: [list new service functions]

API CONTRACT (the bridge):
  Request:    { field: type }
  Response:   { field: type }
  Auth:       [Public / Bearer JWT / Admin]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Closes gap:  [yes — which CLAUDE.md gap? / no]
```

**STOP. Wait for "OK" on scope before building.**

---

**STEP 2 — Backend first (always)**

For each new endpoint, use `/dev-backend-endpoint`.
If schema change needed: use `/dev-backend-schema` (ARCH path — get human approval).

Verify backend is complete:
- Run: `npx tsc --noEmit` in exena-api — 0 errors
- Run: `npx jest --testPathPattern=<module>` — tests pass
- API accessible and returning correct data

---

**STEP 3 — Define the exact API contract (the bridge)**

After backend is done, write out the TypeScript contract the frontend will consume:

```typescript
// This goes into frontend src/types/index.ts

export interface <Entity>Response {
  id: string
  // ... all fields from the actual API response
  createdAt: string  // ISO string
}

export interface Create<Entity>Input {
  // ... fields the POST/PATCH endpoint accepts
}

// Pagination (if list endpoint)
// Use existing Paginated<T> type — don't duplicate
```

---

**STEP 4 — Frontend service function**

Use `/dev-frontend-service` — add type + service function.
Run: `npx tsc --noEmit` in frontend repo.

---

**STEP 5 — Frontend page**

Use `/dev-frontend-page` for each new page.
Use `/dev-frontend-component` for each new reusable component.

Wire: page → useQuery/useMutation → service function → apiClient → API.

Required states in every page:
- Loading state (`isLoading`)
- Error state (`error`)
- Empty state (no data yet)
- Success state (the actual content)

---

**STEP 6 — Verify end-to-end**

Test the full flow manually:
1. Backend running: `npx nest start --watch` (in exena-api)
2. Frontend running: `npm run dev` (in frontend repo)
3. Full user journey: UI action → API call → DB write → UI update

TypeScript checks (both repos):
- `npx tsc --noEmit` in exena-api — 0 errors
- `npx tsc --noEmit` in frontend repo — 0 errors

---

**STEP 7 — Update CORTEX**

- Append to `ai/app.prd.md` changelog
- If gap closed: update gap table in `CLAUDE.md` + update frontend score line
- Update `ai/mermaid/00-PROJECT-MASTER.md` module health if applicable

Backend commit: use `/cortex-commit` → `feat(<module>): [endpoint description]`
Frontend commit: use `/cortex-commit` → `feat(<app>): [page/component description]`

Then: `node scripts/lifecycle.js log --action=FEATURE_ADDED --module=<module> --detail="Full-stack: [feature]. Backend: [endpoints]. Frontend: [app/pages]. Gap closed: [yes/no]"`

---

Output: scope confirmed | backend endpoints | API contract | frontend pages/components | E2E verified | gap closed: yes/no
