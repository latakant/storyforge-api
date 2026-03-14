# nextjs-patterns — Next.js App Router Accuracy Patterns
> Load this before writing any Next.js code: pages, components, hooks, services, middleware.
> Applies to: cortex-build, cortex-fix, cortex-feature, cortex-review, dev-frontend-page, dev-frontend-component

Stack: Next.js 15.5 App Router · React 19 · Tailwind 4 · React Query 5

---

## The Next.js Accuracy Laws

These are the patterns Claude most commonly gets wrong in Next.js App Router.
Read before writing. Check after writing.

---

## LAW 1 — RSC vs Client Component (most violated)

**Default: Server Component.** Only add `'use client'` when you need:
- `useState` / `useReducer` / `useRef`
- `useEffect`
- Browser APIs (`window`, `localStorage`, `navigator`)
- Event handlers (`onClick`, `onChange`)
- React Query hooks (`useQuery`, `useMutation`)
- Context consumers

```tsx
// WRONG — 'use client' on every file
'use client'
export default function ProductCard({ product }) {  // no interactivity needed
  return <div>{product.name}</div>
}

// CORRECT — Server Component (no directive needed)
export default function ProductCard({ product }: { product: Product }) {
  return <div>{product.name}</div>
}

// CORRECT — Client Component when needed
'use client'
import { useState } from 'react'
export default function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false)
  // ...
}
```

**Split pattern:** Keep parent as RSC, extract interactive parts into `*Client.tsx` child.

```
ProductPage.tsx       ← RSC (data fetch, layout)
  └─ ProductActions.client.tsx  ← 'use client' (cart, wishlist buttons)
```

---

## LAW 2 — React Query (server state only)

`useQuery` for GET. `useMutation` for POST/PUT/PATCH/DELETE. Always invalidate on success.

```tsx
// WRONG — fetch in useEffect (stale data, no loading state, no retry)
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setProducts)
}, [])

// CORRECT — useQuery
const { data: products, isLoading, error } = useQuery({
  queryKey: ['products', { page, category }],
  queryFn: () => productService.getAll({ page, category }),
  staleTime: 1000 * 60 * 5,  // 5 min — tune per domain
})

// CORRECT — useMutation with cache invalidation
const addToCart = useMutation({
  mutationFn: (data: AddToCartDto) => cartService.add(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] })
    toast.success('Added to cart')
  },
  onError: (err: ApiError) => toast.error(err.message),
})
```

**queryKey rules:**
- Always an array: `['orders']`, `['orders', orderId]`, `['orders', { status, page }]`
- Include all variables that affect the query result
- Invalidate by prefix: `{ queryKey: ['orders'] }` invalidates all order queries

---

## LAW 3 — Service Layer (never fetch in components)

All API calls go through `services/*.service.ts` → `apiClient`. Never raw `fetch` in a component.

```
Component → useQuery/useMutation → services/product.service.ts → apiClient → API
```

```typescript
// services/product.service.ts
import { apiClient } from '@/lib/api-client'
import type { Product, ProductFilters } from '@/types'

export const productService = {
  getAll: (filters?: ProductFilters): Promise<PaginatedResponse<Product>> =>
    apiClient.get('/products', { params: filters }),

  getById: (id: string): Promise<Product> =>
    apiClient.get(`/products/${id}`),

  create: (data: CreateProductDto): Promise<Product> =>
    apiClient.post('/products', data),

  update: (id: string, data: UpdateProductDto): Promise<Product> =>
    apiClient.patch(`/products/${id}`, data),
}
```

**`apiClient`** wraps axios/fetch with:
- Base URL from `NEXT_PUBLIC_API_URL`
- Auth header injection (reads token from storage)
- Response unwrapping (returns `data` not full response)
- Error normalization (throws `ApiError` with message)

---

## LAW 4 — Token Management (exact keys)

```
Customer app:  exena_access_token  (localStorage or httpOnly cookie)
Admin app:     exena_admin_token   (localStorage or httpOnly cookie)
```

```typescript
// lib/auth.ts — token helpers
const TOKEN_KEY = process.env.NEXT_PUBLIC_IS_ADMIN ? 'exena_admin_token' : 'exena_access_token'

export const getToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token)

export const clearToken = (): void =>
  localStorage.removeItem(TOKEN_KEY)

// api-client.ts — inject on every request
const token = getToken()
if (token) headers['Authorization'] = `Bearer ${token}`
```

**Never:** store token in a React state variable (lost on refresh).
**Never:** read `localStorage` in RSC (runs on server — `window` is undefined).
Always guard: `typeof window !== 'undefined'` before accessing localStorage.

---

## LAW 5 — App Router File Conventions

```
app/
  layout.tsx          ← root layout — html, body, providers
  page.tsx            ← index route (/)
  loading.tsx         ← Suspense fallback for this segment
  error.tsx           ← error boundary ('use client' required)
  not-found.tsx       ← 404 for this segment
  (auth)/             ← route group (no URL segment)
    login/page.tsx
  products/
    page.tsx          ← /products
    [id]/
      page.tsx        ← /products/:id
      loading.tsx     ← skeleton while product loads
```

```tsx
// error.tsx — MUST be 'use client'
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

// loading.tsx — shown automatically during navigation
export default function Loading() {
  return <ProductSkeleton />  // never null — always a meaningful skeleton
}
```

---

## LAW 6 — Error Handling (3 layers)

```
Layer 1: error.tsx boundary  — catches render/data errors in a segment
Layer 2: useMutation onError — catches mutation failures
Layer 3: apiClient interceptor — normalizes all API errors
```

```typescript
// lib/api-client.ts — normalize all errors
axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message ?? 'Something went wrong'
    const status = error.response?.status ?? 500
    return Promise.reject(new ApiError(message, status))
  }
)

// In component — always handle onError
const mutation = useMutation({
  mutationFn: orderService.cancel,
  onError: (err: ApiError) => {
    if (err.status === 401) router.push('/login')
    else toast.error(err.message)
  },
})
```

**Never:** show raw error objects to users. Always extract `.message`.
**Never:** silently swallow errors with empty `catch {}`.

---

## LAW 7 — Form Handling (React Hook Form + Zod)

```tsx
// WRONG — manual form state
const [name, setName] = useState('')
const [email, setEmail] = useState('')
const [errors, setErrors] = useState({})
// ... 30 lines of manual validation

// CORRECT — React Hook Form + Zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
})
type FormData = z.infer<typeof schema>

const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
  resolver: zodResolver(schema),
})

const onSubmit = async (data: FormData) => {
  await mutation.mutateAsync(data)
}
```

---

## LAW 8 — Images (always next/image)

```tsx
// WRONG — raw <img> (no optimization, CLS)
<img src={product.image} alt={product.name} />

// CORRECT — next/image with explicit dimensions
import Image from 'next/image'
<Image
  src={product.imageUrl}
  alt={product.name}
  width={400}
  height={400}
  className="object-cover"
/>

// CORRECT — fill mode (parent must have position: relative + explicit height)
<div className="relative h-64">
  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
</div>
```

**Cloudinary images:** add domain to `next.config.js`:
```js
images: { remotePatterns: [{ hostname: 'res.cloudinary.com' }] }
```

---

## LAW 9 — Route Protection (middleware.ts)

```typescript
// middleware.ts — runs on edge before page renders
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/account', '/orders', '/checkout']
const AUTH_PATH = '/login'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('exena_access_token')?.value
  const isProtected = PROTECTED_PATHS.some(p => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(AUTH_PATH, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**Never:** protect routes only client-side — a user can bypass JS.
Middleware runs server-side and cannot be bypassed.

---

## LAW 10 — Tailwind + cn() for Conditional Classes

```tsx
// WRONG — string concatenation (breaks with falsy values, hard to read)
className={`btn ${isActive ? 'btn-primary' : ''} ${disabled ? 'opacity-50' : ''}`}

// CORRECT — cn() from clsx + tailwind-merge
import { cn } from '@/lib/utils'

className={cn(
  'btn',
  isActive && 'btn-primary',
  disabled && 'opacity-50 cursor-not-allowed',
  className,  // always accept and merge external className
)}

// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## LAW 11 — Loading States (Suspense + Skeletons)

```tsx
// WRONG — conditional render flickers, no layout stability
{isLoading ? <div>Loading...</div> : <ProductList products={data} />}

// CORRECT — skeleton that matches real layout
{isLoading ? (
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
  </div>
) : (
  <div className="grid grid-cols-3 gap-4">
    {data?.map(p => <ProductCard key={p.id} product={p} />)}
  </div>
)}

// CORRECT — App Router Suspense (preferred for RSC)
<Suspense fallback={<ProductListSkeleton />}>
  <ProductList />    {/* async RSC fetches inside */}
</Suspense>
```

**Rule:** Skeleton must match real content dimensions — prevents layout shift.

---

## LAW 12 — Optimistic Updates (useMutation)

```tsx
// For instant UI feedback before server confirms
const queryClient = useQueryClient()

const toggleWishlist = useMutation({
  mutationFn: wishlistService.toggle,

  onMutate: async (productId: string) => {
    // 1. Cancel in-flight queries (avoid overwrite)
    await queryClient.cancelQueries({ queryKey: ['wishlist'] })
    // 2. Snapshot current state
    const previous = queryClient.getQueryData<string[]>(['wishlist'])
    // 3. Optimistically update
    queryClient.setQueryData<string[]>(['wishlist'], (old = []) =>
      old.includes(productId)
        ? old.filter(id => id !== productId)
        : [...old, productId]
    )
    return { previous }
  },

  onError: (_err, _productId, context) => {
    // 4. Rollback on error
    queryClient.setQueryData(['wishlist'], context?.previous)
    toast.error('Failed to update wishlist')
  },

  onSettled: () => {
    // 5. Always re-sync with server
    queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  },
})
```

Use optimistic updates for: wishlist toggle, cart quantity, like/unlike.
Skip for: order placement, payment — always wait for server confirmation.

---

## SEARCH-FIRST CHECKLIST

Before writing any new Next.js code:

- [ ] Is there already a service function for this API call? Search `services/*.service.ts`
- [ ] Is there already a component for this UI pattern? Search `components/`
- [ ] Does this need state/effects? → `'use client'` required (Law 1)
- [ ] Am I fetching data? → `useQuery` not `useEffect+fetch` (Law 2)
- [ ] Does this form need validation? → React Hook Form + Zod (Law 7)
- [ ] Am I using `<img>`? → replace with `next/image` (Law 8)
- [ ] Am I building a protected page? → check middleware.ts (Law 9)
- [ ] Am I concatenating classnames? → use `cn()` (Law 10)

---

## COMMON MISTAKES CLAUDE MAKES IN NEXT.JS

| Mistake | Correct pattern |
|---------|-----------------|
| `'use client'` on every file | Only when hooks/events needed (Law 1) |
| `fetch` in `useEffect` | `useQuery` with React Query (Law 2) |
| Direct axios call in component | Through `services/*.service.ts` (Law 3) |
| Reading `localStorage` in RSC | Guard with `typeof window !== 'undefined'` (Law 4) |
| Forgetting `error.tsx` needs `'use client'` | Always add `'use client'` (Law 5) |
| Raw `<img>` tag | `next/image` always (Law 8) |
| Client-only route protection | Use `middleware.ts` (Law 9) |
| String class concatenation | `cn()` from clsx+tailwind-merge (Law 10) |
| `<div>Loading...</div>` spinner | Skeleton matching real layout (Law 11) |
| No `onError` on mutations | Always handle — show toast or redirect (Law 6) |
| Missing `invalidateQueries` after mutation | Always invalidate relevant query keys (Law 2) |
| Forgetting `queryKey` includes all variables | Stale data on filter/page change (Law 2) |
