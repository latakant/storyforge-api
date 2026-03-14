```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /dev-frontend-search  |  v8.0  |  TIER: 11  |  BUDGET: LEAN ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L3 · L7                                             ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Read + write src/app/ · src/components/           ║
║               ║ - Read src/services/ (query integration)            ║
║ CANNOT        ║ - Add client-side full-text search (use API search) ║
║               ║ - Implement search without debounce                 ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║               ║ - Backend search endpoint exists                    ║
║ OUTPUTS       ║ - Search input + result list component              ║
║               ║ - Completion block: COMPLETE                        ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Next.js search UI — debounced input, URL-driven state, React Query, typeahead or full results page.

$ARGUMENTS

Parse: `entity` — what is searched · `endpoint` — API search path · `type` — `inline` (typeahead dropdown) | `page` (full search results page)

---

## CONTEXT: Exena Search Backend

```
Backend:   PostgreSQL full-text search via Prisma OR Prisma ilike
Endpoint:  GET /api/search?q=<query>&category=<id>&page=1&limit=20
Response:  { data: Product[], meta: { total, page, limit, totalPages } }
Min chars: 2 (backend enforces — skip API call for shorter queries)
```

---

## PATTERN A — Inline search (typeahead dropdown)

Best for: header search bar, product quick-find, order lookup by ID.

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'
import { searchService } from '@/services/search.service'

export function ProductSearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 300)  // 300ms — enough for typing

  const { data, isLoading } = useQuery({
    queryKey: ['search', 'products', debouncedQuery],
    queryFn: () => searchService.searchProducts(debouncedQuery),
    enabled: debouncedQuery.length >= 2,  // don't query until meaningful input
    staleTime: 30_000,  // cache results 30s — same query doesn't re-fetch
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search products..."
        className="w-full rounded-full border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
        aria-label="Search products"
        aria-expanded={open}
        aria-haspopup="listbox"
      />

      {open && debouncedQuery.length >= 2 && (
        <div
          role="listbox"
          className="absolute top-full z-50 mt-1 w-full rounded-md border bg-white shadow-lg"
        >
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
          )}

          {!isLoading && data?.data.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">No results for "{debouncedQuery}"</div>
          )}

          {data?.data.map((product) => (
            <a
              key={product.id}
              href={`/products/${product.slug}`}
              role="option"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {product.imageUrl && (
                <img src={product.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
              )}
              <div>
                <div className="text-sm font-medium">{product.name}</div>
                <div className="text-xs text-gray-500">₹{Number(product.price).toLocaleString('en-IN')}</div>
              </div>
            </a>
          ))}

          {data && data.meta.total > data.data.length && (
            <a
              href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
              className="block border-t px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
            >
              See all {data.meta.total} results →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## PATTERN B — Search results page (URL-driven)

Best for: `/search?q=...` page, category+filter search.

```typescript
// src/app/(store)/search/page.tsx
import { Suspense } from 'react'
import { SearchResults } from '@/components/search/search-results'
import { SearchFilters } from '@/components/search/search-filters'

interface SearchPageProps {
  searchParams: { q?: string; category?: string; page?: string; sort?: string }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q ?? ''
  return (
    <main>
      <h1 className="text-xl font-semibold">
        {query ? `Results for "${query}"` : 'All Products'}
      </h1>
      <div className="flex gap-6">
        <SearchFilters />
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults params={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}
```

```typescript
// src/components/search/search-results.tsx — 'use client'
'use client'

import { useQuery } from '@tanstack/react-query'
import { searchService } from '@/services/search.service'

export function SearchResults({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['search', params],
    queryFn: () => searchService.search(params),
    enabled: true,
  })

  // ... render grid + pagination
}
```

---

## DEBOUNCE HOOK

```typescript
// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /dev-frontend-search            COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type       [inline | page] — [entity]
Debounce   300ms ✅ | min 2 chars ✅ | cached 30s ✅
A11y       aria-expanded + aria-haspopup + role=listbox ✅
Next       place <SearchBar /> in layout or <SearchResults /> in page
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
