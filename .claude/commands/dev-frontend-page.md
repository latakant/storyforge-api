Add a new Next.js App Router page to exena-web or exena-admin.

$ARGUMENTS

Parse: app (web/admin), route path (e.g., /orders/[id] or /customers/[id]), feature description.

---

**STEP 1 — Server component vs client component decision**

Answer before writing:
| Condition | Decision |
|-----------|----------|
| Needs `useState`, `useEffect`, `useQuery`, `useMutation` | `'use client'` |
| Has click handlers, form submit, interactive state | `'use client'` |
| Pure display, no interaction, no hooks | Server component (no directive) |
| Needs browser APIs (localStorage, window) | `'use client'` |

> Rule: Prefer server component for layout wrapper/skeleton. Use `'use client'` for the interactive inner component.

---

**STEP 2 — Check the API contract**
Read `CLAUDE.md` API Contract — find the endpoints this page will call.
Note: public endpoints vs auth-required vs admin-only.

If the service function doesn't exist yet: use `/dev-frontend-service` first, then return here.

---

**STEP 3 — Check types**
Read `src/types/index.ts` in the frontend repo.
If the response type for this page's data doesn't exist: add the interface first.

---

**STEP 4 — Build the page**

File location: `src/app/<route>/page.tsx`

Template for 'use client' page (most common):
```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/layout/AdminLayout' // admin only
import { get<Entity>, update<Entity> } from '@/services/<service>.service'
import { <EntityType> } from '@/types'

export default function <Entity>Page() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<<EntityType>>({
    queryKey: ['<entity>'],
    queryFn: get<Entity>,
  })

  const { mutate: update } = useMutation({
    mutationFn: update<Entity>,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['<entity>'] }),
  })

  if (isLoading) return <div className="p-6">Loading...</div>
  if (error) return <div className="p-6 text-red-500">Failed to load data</div>
  if (!data) return <div className="p-6">No data found</div>

  return (
    <AdminLayout> {/* admin only — remove for exena-web */}
      {/* page content */}
    </AdminLayout>
  )
}
```

Rules:
- Always handle: `isLoading`, `error`, empty/null data — never assume data exists
- Prices: `formatCurrency(amount)` from `lib/utils.ts` — never format manually
- Dates: `formatDate(date)` from `lib/utils.ts`
- Auth: `useAuth()` from `AuthContext` — never read `localStorage` directly
- Classes: `cn()` from `lib/utils.ts` for conditional Tailwind
- Never: raw `fetch()` or `axios` calls — always through `services/*.service.ts`

---

**STEP 5 — Add to navigation (if new top-level route)**
- exena-admin: update `src/components/layout/AdminLayout.tsx` — add to the sidebar nav items (9 current items)
- exena-web: update the relevant nav component

---

**STEP 6 — TypeScript check**
Run: `npx tsc --noEmit` from within the frontend repo directory.
0 errors required.

---

**STEP 7 — Update CORTEX**
- Append to `ai/app.prd.md` changelog (from exena-api repo)
- Update CLAUDE.md page count if new page added (exena-web: 16 → N or exena-admin: 14 → N)
- If this closes a known gap: update the gap table in CLAUDE.md + update the frontend score

---

**STEP 8 — Commit**
Use `/cortex-commit` with: `feat(<app>): add [route] page for [feature]`

---

Output: server/client decision | API used | types added | loading+error states | nav updated | tsc passing
