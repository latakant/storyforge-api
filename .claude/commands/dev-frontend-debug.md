Debug a frontend issue in exena-web or exena-admin — systematic layer isolation.

$ARGUMENTS

Description of the issue: what the user sees, what action triggers it, error message if any.

---

**STEP 1 — Triage: which layer is failing?**

```
User sees network error / 4xx / 5xx   → API is failing → use /dev-backend-debug first
User sees 401 Unauthorized            → Token missing, expired, or refresh failing
User sees wrong/stale data            → React Query cache issue
Page is blank / white screen          → Uncaught render error (missing null check / error boundary)
Hydration mismatch error              → Server/client component boundary violation
Component not rendering               → Props undefined, conditional rendering bug
Type error in console                 → Interface mismatch between API response and frontend type
Token refresh loops / stuck           → Interceptor deadlock in api-client.ts
Data loads then disappears            → React Query staleTime too short or invalidation wrong
```

---

**STEP 2 — Check the actual HTTP response**

Before reading any code:
- Open browser DevTools → Network tab
- Find the API request that's failing
- Check: HTTP status, response body, request headers (is Authorization header present?)

If API returns an error: **stop here**. The bug is in the backend. Use `/dev-backend-debug`.
If API returns correct data: the bug is in the frontend. Continue.

---

**STEP 3 — Isolate the frontend layer**

**Layer A — Service function**
Read: `src/services/<service>.service.ts`
Check:
- Is it calling the right endpoint path?
- Is it destructuring `.data` correctly? (`data.data` for wrapped vs `data` for direct)
- Does the return type match `src/types/index.ts`?

**Layer B — TypeScript interface**
Read: `src/types/index.ts`
Check:
- Does the interface match the actual API response shape?
- Missing fields? Wrong field names? Optional when it should be required?
- Date fields: should be `string` (ISO), not `Date`

**Layer C — React Query**
Find the `useQuery`/`useMutation` call.
Check:
- `queryKey`: does it include all variables that affect the result (id, filters)?
- After mutation `onSuccess`: is `invalidateQueries` called with the EXACT same queryKey?
- `enabled` condition: is it preventing the query when it shouldn't?
- `staleTime`: if set, is it causing stale data to show?

**Layer D — Component rendering**
Read the component code.
Check:
- Is there a null/undefined check before accessing nested properties?
  - Wrong: `data.user.name` → crashes if `data` is undefined during loading
  - Right: `data?.user?.name` or check `isLoading` first
- Is there a loading state? (`if (isLoading) return <Skeleton />`)
- Is there an empty state? (`if (!data || data.length === 0) return <EmptyState />`)

---

**STEP 4 — Apply the fix**

Minimal change only — don't refactor while debugging.

Common fixes:
```typescript
// Missing null check
- <p>{order.customer.name}</p>
+ <p>{order?.customer?.name ?? 'Unknown'}</p>

// Wrong data destructuring
- const { data } = await apiClient.get('/api/orders')
+ const { data } = await apiClient.get<{ data: Order[] }>('/api/orders')
+ return data.data  // not just data

// Stale queryKey (missing dependency)
- queryKey: ['orders']
+ queryKey: ['orders', { page, status }]  // include all filter params

// Wrong invalidation (queryKey mismatch)
- onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order'] })
+ onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })

// Hydration error: client-only code in server component
+ 'use client'  // add at top of file
```

---

**STEP 5 — TypeScript check**
Run: `npx tsc --noEmit` from within the frontend repo.
0 errors required.

---

**STEP 6 — Verify manually**
Check the full flow works: action → API call → data updates → UI reflects change.

---

**STEP 7 — Complete via CORTEX**
Use `/cortex-bug` for the FIX_LOG, TRACKER, lifecycle log, and pattern intelligence.

---

Output: layer isolated (API/service/React Query/component) | root cause | fix applied | tsc passing
