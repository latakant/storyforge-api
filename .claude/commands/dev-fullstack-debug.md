Debug a cross-layer issue spanning both the API and frontend.

$ARGUMENTS

Description of the problem: what the user sees on the frontend, what action triggers it, any error messages.

Cross-layer bugs are hardest because the problem could be at any layer. Isolate before fixing.

---

**STEP 1 — Capture the symptom precisely**

If $ARGUMENTS is vague, clarify:
- What does the user see? (error text, blank area, wrong data, spinner that never stops)
- What action triggers it? (button click, page load, form submit, navigation)
- Always or sometimes? (always = logic bug / sometimes = race condition or state timing)
- Which app? (exena-web / exena-admin)

---

**STEP 2 — Systematic layer isolation**

Check in this exact order — stop at the first broken layer:

```
LAYER A: Is the API returning correct data?
  → Open DevTools Network tab
  → Find the failing HTTP request
  → Check: status code, response body, Authorization header present?
  → If API error (4xx/5xx): STOP → use /dev-backend-debug
  → If API returns correct data: go to Layer B

LAYER B: Is the service function parsing correctly?
  → Read src/services/<service>.service.ts
  → Is it calling the right path?
  → Is it destructuring .data.data vs .data correctly?
  → Does the TypeScript interface in types/index.ts match the actual response?
  → If mismatch: fix the service function or type → verify → done

LAYER C: Is React Query caching stale data?
  → Find the useQuery/useMutation call in the page
  → Check queryKey — does it include all variables (id, filters, page)?
  → After mutation onSuccess: does invalidateQueries use the EXACT same queryKey?
  → Is there a staleTime that's keeping old data?
  → If issue here: fix the queryKey or invalidation

LAYER D: Is the component rendering incorrectly?
  → Read the component
  → Is data accessed before null check? (data.field while data is undefined = crash)
  → Is there a loading state? An empty state?
  → Is the prop type matching what's actually passed?
  → If issue here: add null check, loading state, or fix prop type
```

---

**STEP 3 — Fix only the identified layer**

- Layer A → `/dev-backend-debug`
- Layer B → fix the service function or `src/types/index.ts`
- Layer C → fix the `queryKey` or `invalidateQueries` call
- Layer D → fix the component (null check / loading state / prop type)

Never fix multiple layers at once — one change at a time, verify after each.

---

**STEP 4 — Verify the full flow**

After the fix, verify manually:
1. Trigger the action that was failing
2. Confirm: data loads → updates correctly → UI reflects the change
3. Confirm: no console errors

---

**STEP 5 — TypeScript check (both repos)**
- Run: `npx tsc --noEmit` in exena-api (if backend changed)
- Run: `npx tsc --noEmit` in frontend repo
Both must pass.

---

**STEP 6 — Complete via CORTEX**
Use `/cortex-bug` with the bug description.
Handles: FIX_LOG, TRACKER, lifecycle log (BUG_FIXED), pattern intelligence check.

---

Output: layer identified (A/B/C/D) | root cause | fix applied | both tsc passing | E2E verified
