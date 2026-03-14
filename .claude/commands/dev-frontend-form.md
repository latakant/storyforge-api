```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /dev-frontend-form  |  v8.0  |  TIER: 11  |  BUDGET: MODERATE ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L3 · L7 · L8                                        ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Read + write src/app/ · src/components/           ║
║               ║ - Read src/services/ (API integration)              ║
║               ║ - Run TypeScript check on frontend project          ║
║ CANNOT        ║ - Modify backend DTOs (frontend must match, not own)║
║               ║ - Add server-side validation (client validates UX,  ║
║               ║   API validates truth)                               ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║               ║ - React Hook Form + Zod installed                   ║
║ ESCALATES     ║ - Form submits without backend contract check → flag║
║ OUTPUTS       ║ - Form component with validation + mutation         ║
║               ║ - Completion block: COMPLETE                        ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Next.js form with React Hook Form + Zod validation + React Query mutation. Pattern: validate client-side → submit → handle server errors.

$ARGUMENTS

Parse: `form-name` · `endpoint` (POST/PUT path) · `fields` (list) · `auth` — `required` | `public`

---

## CONTEXT: Exena Form Stack

```
Validation:  Zod (client-side schema) + React Hook Form (field control)
API calls:   useMutation from React Query → apiClient (axios instance)
Error display: field-level (Zod) + server-level (API error message)
Auth token:  exena_access_token (customer) | exena_admin_token (admin)
```

---

## STEP 1 — Zod schema (mirrors backend DTO)

```typescript
// Match the backend DTO fields and constraints exactly
import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  price: z.number().positive('Price must be positive').multipleOf(0.01),
  description: z.string().max(1000).optional(),
  categoryId: z.string().cuid('Select a valid category'),
})

export type CreateProductForm = z.infer<typeof createProductSchema>
```

**Key rule:** Frontend Zod schema must match backend DTO validation. If they diverge, users see client success but server error. When DTO changes, update schema.

---

## STEP 2 — Form component

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProductSchema, CreateProductForm } from './schema'
import { productsService } from '@/services/products.service'

interface CreateProductFormProps {
  onSuccess?: () => void
}

export function CreateProductForm({ onSuccess }: CreateProductFormProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
  })

  const mutation = useMutation({
    mutationFn: productsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      reset()
      onSuccess?.()
    },
    onError: (error: ApiError) => {
      // Map server errors to form fields if possible
      if (error.statusCode === 409) {
        setError('name', { message: 'A product with this name already exists' })
      } else {
        setError('root', { message: error.message || 'Something went wrong. Please try again.' })
      }
    },
  })

  const onSubmit = (data: CreateProductForm) => mutation.mutate(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Product Name
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Repeat for other fields */}

      {/* Server-level error (not field-specific) */}
      {errors.root && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{errors.root.message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || mutation.isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  )
}
```

---

## STEP 3 — Service layer

```typescript
// src/services/products.service.ts
import { apiClient } from '@/lib/api-client'

export const productsService = {
  create: (data: CreateProductForm) =>
    apiClient.post('/products', data).then((r) => r.data),

  update: (id: string, data: UpdateProductForm) =>
    apiClient.put(`/products/${id}`, data).then((r) => r.data),
}
```

---

## EDIT FORM PATTERN (UPDATE variant)

For edit forms, prefill with `defaultValues`:

```typescript
const { data: product } = useQuery({
  queryKey: ['product', id],
  queryFn: () => productsService.findOne(id),
})

const form = useForm<EditProductForm>({
  resolver: zodResolver(editProductSchema),
  defaultValues: product,  // ← prefills form with existing values
})
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /dev-frontend-form              COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Form       [form-name] — [N] fields
Validation Zod schema matches DTO ✅
Errors     field-level + server-level handled ✅
Next       import form into page component, wrap in layout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
