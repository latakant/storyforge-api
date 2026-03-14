Add or update an API service function for exena-web or exena-admin.

$ARGUMENTS

Parse: app (web/admin), module name, HTTP method + path, description.

---

**STEP 1 — Confirm the API contract**
Read `CLAUDE.md` API Contract section for the relevant module.
Verify: endpoint exists in backend, HTTP method, auth requirement, request shape, response shape.

> Never build a service function for an endpoint that doesn't exist in the backend.
> If the backend endpoint isn't ready: use `/dev-backend-endpoint` first.

---

**STEP 2 — Check existing service file**
Read: `src/services/<service>.service.ts`

Note:
- Existing function naming convention (getOrders, createOrder, updateOrder)
- How `apiClient` is used (destructure `{ data }` from response)
- Existing error handling pattern

---

**STEP 3 — Check and update types**
Read: `src/types/index.ts`

If the response interface doesn't exist:
```typescript
// Add to src/types/index.ts
export interface <Entity> {
  id: string
  // ... fields matching the API response exactly
  createdAt: string  // ISO string (not Date — JSON serialization)
  updatedAt: string
}

export interface Paginated<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

---

**STEP 4 — Write the service function**

```typescript
import { apiClient } from '@/lib/api-client'
import { <Entity>, Paginated } from '@/types'

// GET single
export async function get<Entity>(id: string): Promise<<Entity>> {
  const { data } = await apiClient.get<{ data: <Entity> }>(`/api/<path>/${id}`)
  return data.data
}

// GET list (paginated)
export async function get<Entity>s(params?: {
  page?: number
  limit?: number
}): Promise<Paginated<<Entity>>> {
  const { data } = await apiClient.get<Paginated<<Entity>>>('/api/<path>', { params })
  return data
}

// POST
export async function create<Entity>(payload: Create<Entity>Input): Promise<<Entity>> {
  const { data } = await apiClient.post<{ data: <Entity> }>('/api/<path>', payload)
  return data.data
}

// PATCH
export async function update<Entity>(id: string, payload: Partial<Create<Entity>Input>): Promise<<Entity>> {
  const { data } = await apiClient.patch<{ data: <Entity> }>(`/api/<path>/${id}`, payload)
  return data.data
}

// DELETE
export async function delete<Entity>(id: string): Promise<void> {
  await apiClient.delete(`/api/<path>/${id}`)
}
```

Rules:
- Always destructure `{ data }` from apiClient response
- Always return typed value — never `any`
- Never add auth headers manually — `api-client.ts` interceptor handles JWT automatically
- 401 handling: `api-client.ts` interceptor handles token refresh — don't duplicate
- Throw all other errors — let React Query catch and surface them
- Paginated list: return the full `Paginated<T>` object (not just the array)

---

**STEP 5 — TypeScript check**
Run: `npx tsc --noEmit`
0 errors required.

---

**STEP 6 — Show React Query wiring**

Provide the usage pattern for the new service function:

```typescript
// Read (useQuery)
const { data, isLoading, error } = useQuery<Paginated<<Entity>>>({
  queryKey: ['<entity>', params],
  queryFn: () => get<Entity>s(params),
})

// Write (useMutation)
const { mutate, isPending } = useMutation({
  mutationFn: create<Entity>,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['<entity>'] })
    // show success toast, close modal, etc.
  },
  onError: (error) => {
    // show error message
  },
})
```

---

Output: API contract confirmed | type added to types/index.ts | service function | React Query usage pattern | tsc passing
