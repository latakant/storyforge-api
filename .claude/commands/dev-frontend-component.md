Build a reusable UI component for exena-web or exena-admin.

$ARGUMENTS

Parse: app (web/admin), component name (PascalCase), what it does, where it will be used.

---

**STEP 1 — Classify the component**

| Type | When | Directive |
|------|------|-----------|
| Pure display | Only renders props, no state | No `'use client'` |
| Interactive | Has `useState`, event handlers | `'use client'` |
| Data-connected | Fetches its own data | `'use client'` + `useQuery` inside |
| Form | Submit, validation, mutation | `'use client'` + `useMutation` |

> Prefer receiving data as props over fetching inside the component when possible (easier to test, easier to compose).

---

**STEP 2 — Check Radix UI first**

Before building from scratch, check if a Radix primitive exists:

| Need | Radix Package |
|------|--------------|
| Modal / Dialog | `@radix-ui/react-dialog` |
| Dropdown menu | `@radix-ui/react-dropdown-menu` |
| Select input | `@radix-ui/react-select` |
| Checkbox | `@radix-ui/react-checkbox` |
| Switch / Toggle | `@radix-ui/react-switch` |
| Tabs | `@radix-ui/react-tabs` |
| Toast / Alert | `@radix-ui/react-toast` |
| Tooltip | `@radix-ui/react-tooltip` |
| Accordion | `@radix-ui/react-accordion` |

Always prefer Radix primitives — they handle accessibility, keyboard navigation, and ARIA attributes.

---

**STEP 3 — Build the component**

File location:
- Reusable UI primitive → `src/components/ui/<ComponentName>.tsx`
- Domain-specific (e.g., OrderCard) → `src/components/<domain>/<ComponentName>.tsx`

Template:
```typescript
'use client' // only if interactive

import { cn } from '@/lib/utils'

interface <ComponentName>Props {
  value: string           // explicit types — no `any`
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string      // always allow className override
}

export function <ComponentName>({
  value,
  onChange,
  disabled = false,
  className,
}: <ComponentName>Props) {
  return (
    <div className={cn('base-classes here', className)}>
      {/* Radix primitive or semantic HTML */}
    </div>
  )
}
```

Rules:
- Named export (not default) — better tree-shaking and import clarity
- No inline styles — Tailwind 4 classes only
- `cn()` from `lib/utils.ts` for conditional/merged classes
- `className` prop on every component — always allow caller to override
- No `any` in props — explicit types for every field
- Prices passed as `number` — component calls `formatCurrency()` internally

---

**STEP 4 — TypeScript check**
Run: `npx tsc --noEmit`
0 errors required.

---

**STEP 5 — Add usage example (JSDoc)**
```typescript
/**
 * <ComponentName> — [one-line description of what it does]
 *
 * @example
 * <ComponentName> value={selectedValue} onChange={setSelectedValue} />
 *
 * @example with custom class
 * <ComponentName> value={val} onChange={setVal} className="mt-4" />
 */
```

---

Output: Radix primitive used (or custom justification) | prop interface | Tailwind classes | tsc passing
