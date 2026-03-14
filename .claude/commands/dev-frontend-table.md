```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /dev-frontend-table  |  v8.0  |  TIER: 11  |  BUDGET: LEAN  ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L3 · L7                                             ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Read + write src/app/ · src/components/           ║
║               ║ - Read src/services/ (query integration)            ║
║ CANNOT        ║ - Add server-side filtering without backend support  ║
║               ║ - Load all records without pagination               ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║               ║ - React Query + apiClient configured                ║
║ OUTPUTS       ║ - Data table component with pagination + sort       ║
║               ║ - Completion block: COMPLETE                        ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Next.js data table — paginated, sortable, with loading/empty/error states. React Query driven.

$ARGUMENTS

Parse: `entity` — what is being listed · `endpoint` — API path · `columns` — field list · `actions` — view/edit/delete

---

## CONTEXT: Exena Table Pattern

```
Data source:  useQuery → paginated API (page, limit, total, totalPages)
Pagination:   URL search params (?page=1&limit=20) — bookmarkable
Sort:         URL search params (?sort=createdAt&order=desc)
Row actions:  inline buttons (view, edit, delete) or row click → navigate
Loading:      skeleton rows (not spinner — avoids layout shift)
Empty:        explicit empty state component
Error:        error boundary or inline error message
```

---

## STEP 1 — Query hook

```typescript
// src/hooks/use-paginated-orders.ts (or similar per entity)
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { ordersService } from '@/services/orders.service'

export function usePaginatedOrders() {
  const searchParams = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)
  const sort = searchParams.get('sort') ?? 'createdAt'
  const order = searchParams.get('order') ?? 'desc'

  return useQuery({
    queryKey: ['orders', { page, limit, sort, order }],
    queryFn: () => ordersService.findAll({ page, limit, sort, order }),
    placeholderData: (prev) => prev,  // keep previous data while loading next page
  })
}
```

---

## STEP 2 — Table component

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { usePaginatedOrders } from '@/hooks/use-paginated-orders'

export function OrdersTable() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, isLoading, isError } = usePaginatedOrders()

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    if (key !== 'page') params.set('page', '1')  // reset page on filter change
    router.push(`${pathname}?${params.toString()}`)
  }

  if (isError) {
    return <div className="rounded bg-red-50 p-4 text-red-800">Failed to load orders.</div>
  }

  return (
    <div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortableHeader
              label="Order ID"
              field="id"
              currentSort={searchParams.get('sort')}
              currentOrder={searchParams.get('order')}
              onSort={(field, order) => { setParam('sort', field); setParam('order', order) }}
            />
            <SortableHeader label="Date" field="createdAt" ... />
            <th>Status</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} columns={5} />)
            : data?.data.length === 0
            ? <EmptyRow message="No orders found" colSpan={5} />
            : data?.data.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono text-sm">{order.id.slice(-8)}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>₹{Number(order.total).toLocaleString('en-IN')}</td>
                  <td>
                    <button onClick={() => router.push(`/admin/orders/${order.id}`)}>View</button>
                  </td>
                </tr>
              ))
          }
        </tbody>
      </table>

      {data && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          onPageChange={(p) => setParam('page', String(p))}
        />
      )}
    </div>
  )
}
```

---

## STEP 3 — Shared sub-components

```typescript
// SortableHeader — shows arrow, toggles asc/desc
function SortableHeader({ label, field, currentSort, currentOrder, onSort }) {
  const isActive = currentSort === field
  const nextOrder = isActive && currentOrder === 'asc' ? 'desc' : 'asc'
  return (
    <th onClick={() => onSort(field, nextOrder)} className="cursor-pointer select-none px-4 py-3 text-left">
      {label} {isActive ? (currentOrder === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  )
}

// SkeletonRow — loading state
function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  )
}

// Pagination — page controls
function Pagination({ page, totalPages, total, onPageChange }) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <span className="text-sm text-gray-500">{total} total results</span>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</button>
        <span>{page} / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  )
}
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /dev-frontend-table             COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Table      [entity] — [N] columns | paginated ✅ | sortable ✅
States     loading (skeleton) ✅ | empty ✅ | error ✅
URL state  page + sort params in URL ✅
Next       add to page: <EntityTable /> in 'use client' page component
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
