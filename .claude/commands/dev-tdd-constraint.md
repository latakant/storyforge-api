TDD for DB constraint violations — CHECK, UNIQUE, FK. Write tests before adding migrations.

$ARGUMENTS

Parse: `constraint-name` · `table` · `expected-http-status` (409|400|404)
Example: `stock_non_negative products 409`
Example: `price_positive products 400`
Example: `variant_stock_non_negative product_variants 409`

---

## WHY THIS SKILL EXISTS

DB constraints are the last line of defense against data corruption.
When they fire, they must surface as a correct HTTP status — not a raw 500.

This skill enforces: **write the test BEFORE the constraint is live in production.**

TDD order for a new constraint:
```
1. Write test → confirm it would fail (or does fail — constraint already exists but untested)
2. Add/verify the migration SQL
3. Add/verify the HTTP exception filter mapping
4. Run test → GREEN
5. Commit migration + filter + test together
```

---

## STEP 1 — CHECK CURRENT STATE

**Does the constraint exist in DB?**
```bash
grep -r "<constraint-name>" prisma/migrations/ --include="*.sql"
```

**Is it mapped in the exception filter?**
```bash
grep -n "<constraint-name>" src/shared/filters/http-exception.filter.ts
```

**Does a test already cover it?**
```bash
grep -rn "<constraint-name>\|constraint.*<table>" src/ test/ --include="*.spec.ts"
```

Record gaps found:
```
Constraint in migration: YES/NO → [file]
Mapped in filter:        YES/NO → [line]
Test exists:             YES/NO
```

---

## STEP 2 — RED: Write the failing test

Open the spec file for the service that triggers this constraint:
`src/modules/<module>/<module>.service.spec.ts`

Write a test that simulates the constraint firing via `PrismaClientKnownRequestError`.

**Template — CHECK constraint violation (P2004-style):**
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

describe('<method that decrements/writes constrained field>', () => {
  it('should throw ConflictException when <constraint-name> fires', async () => {
    // Arrange — simulate DB rejecting the write because constraint failed
    // CHECK constraints arrive as PrismaClientKnownRequestError in the default: branch
    // Prisma wraps the PG error: "violates check constraint \"<constraint-name>\""
    const constraintError = new PrismaClientKnownRequestError(
      `violates check constraint "${<constraint-name>}"`,   // ← message must include exact name
      { code: 'P2004', clientVersion: '6.0.0' }
    )

    // Mock the DB call that would trigger this constraint
    // (the decrement/update that could go negative)
    mockPrismaService.$transaction.mockImplementation(async (fn) => {
      // Let the transaction run until the constrained update, then throw
      mockPrismaService.<model>.update.mockRejectedValueOnce(constraintError)
      return fn(mockPrismaService)
    })

    // Act + Assert — service must propagate as the correct HTTP exception
    // Note: service re-throws, filter converts to HTTP — test the service throw
    await expect(
      service.<method>(<valid args that would trigger decrement>)
    ).rejects.toThrow()

    // Verify the thrown error is the constraint error (propagated, not swallowed)
    await expect(
      service.<method>(<valid args>)
    ).rejects.toMatchObject({ code: 'P2004' })
  })
})
```

**Template — UNIQUE constraint violation (P2002):**
```typescript
it('should throw ConflictException when <constraint-name> fires', async () => {
  const uniqueError = new PrismaClientKnownRequestError(
    'Unique constraint failed',
    { code: 'P2002', clientVersion: '6.0.0', meta: { target: ['<field>'] } }
  )
  mockPrismaService.<model>.create.mockRejectedValue(uniqueError)

  await expect(service.<method>(dto)).rejects.toThrow(ConflictException)
})
```

**Run — must fail (RED):**
```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -20
```

If already passing → **the constraint is already tested. Stop. Report it.**

---

## STEP 3 — Verify migration SQL (or write it)

**If constraint does NOT exist in migrations yet — create the migration:**
```bash
# Generate empty migration
npx prisma migrate dev --create-only --name add_<constraint-name>
```

Edit the generated file to add:
```sql
-- <Human description: what this prevents>
ALTER TABLE "<table>" ADD CONSTRAINT "<constraint-name>" CHECK (<condition>);
```

Rules:
- No `DEFERRABLE` clause → constraint must be `NOT DEFERRABLE INITIALLY IMMEDIATE` (default)
- Immediate = fires at statement level inside transaction → triggers rollback correctly
- Name must exactly match what the filter checks for

**If constraint already exists — verify it is NOT deferrable:**
```bash
grep -A 2 "<constraint-name>" prisma/migrations/**/*.sql
```
Must NOT contain `DEFERRABLE`. If it does → constraint fires at commit time, not statement time → transaction may not roll back cleanly.

---

## STEP 4 — Verify the HTTP exception filter mapping

Open: `src/shared/filters/http-exception.filter.ts`

The filter must handle this constraint by name, NOT generically by error code.

**Required pattern:**
```typescript
// Inside the default: branch of the Prisma error switch
const msg = exception.message || '';
if (msg.includes('check constraint') || msg.includes('Check constraint')) {
  if (msg.includes('<constraint-name>')) {
    status = HttpStatus.<CORRECT_STATUS>;   // 409 for stock/resource, 400 for input validation
    message = '<User-facing message>';
  }
  // ... other constraints
}
```

**Status mapping rules:**
| Constraint type | HTTP Status | Reason |
|----------------|-------------|--------|
| Stock goes negative | **409 Conflict** | Resource state conflict — not a bad input |
| Price/quantity not positive | **400 Bad Request** | Invalid client data |
| Rating out of range | **400 Bad Request** | Invalid client data |
| Order total not positive | **400 Bad Request** | Invalid client data |
| Custom business constraint | 409 or 400 — decide based on: "is the input invalid, or is the system state the problem?" |

**DO NOT** map `P2004` generically to any status. Always check the constraint name.

If the mapping is missing → add it now before proceeding to GREEN.

---

## STEP 5 — GREEN: Run tests

```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -20
```

Must pass. If not:
- Is the mock setup wrong? (wrong error code, wrong message format) → fix mock
- Is the filter mapping wrong? → fix filter
- Is the service swallowing the error? → service should re-throw constraint errors, not catch them

Also run the filter's own tests if they exist:
```bash
npx jest --testPathPattern=http-exception --verbose 2>&1 | tail -10
```

---

## STEP 6 — Write the filter unit test (if missing)

The filter itself should have a direct unit test for this constraint mapping.

```typescript
// src/shared/filters/http-exception.filter.spec.ts (create if missing)
describe('HttpExceptionFilter — CHECK constraints', () => {
  it('should return 409 when stock_non_negative constraint fires', () => {
    const error = new PrismaClientKnownRequestError(
      'violates check constraint "stock_non_negative"',
      { code: 'P2004', clientVersion: '6.0.0' }
    )
    // mock ArgumentsHost → call filter.catch(error, host)
    // assert response.status was called with 409
    // assert response.json was called with { statusCode: 409, message: 'Insufficient stock...' }
  })

  it('should return 400 when price_positive constraint fires', () => {
    const error = new PrismaClientKnownRequestError(
      'violates check constraint "price_positive"',
      { code: 'P2004', clientVersion: '6.0.0' }
    )
    // same pattern — assert 400
  })

  it('should return 500 for unknown CHECK constraint (do not swallow silently)', () => {
    const error = new PrismaClientKnownRequestError(
      'violates check constraint "unknown_constraint"',
      { code: 'P2004', clientVersion: '6.0.0' }
    )
    // assert status 500 + logger.error called
  })
})
```

---

## STEP 7 — Full suite + TypeScript

```bash
npx tsc --noEmit
npx jest --verbose 2>&1 | tail -10
```

Both must be clean.

---

## STEP 8 — COMMIT

Commit includes: migration SQL + filter mapping + service test + filter test.
Never commit a constraint without its test. Never commit a test without the constraint.

```
test(constraint): TDD — <constraint-name> → HTTP <status> — <N> test cases
```

---

## CONSTRAINT INVENTORY (this project)

| Constraint name | Table | HTTP | Status |
|----------------|-------|------|--------|
| `stock_non_negative` | `products` | 409 | ✅ mapped · ❌ no service test |
| `variant_stock_non_negative` | `product_variants` | 409 | ✅ mapped · ❌ no service test |
| `price_positive` | `products` | 400 | ✅ mapped · ❌ no test |
| `oi_quantity_positive` | `order_items` | 400 | ✅ mapped · ❌ no test |
| `ci_quantity_positive` | `cart_items` | 400 | ✅ mapped · ❌ no test |
| `order_total_positive` | `orders` | 400 | ✅ mapped · ❌ no test |
| `rating_range` | `reviews` | 400 | ✅ mapped · ❌ no test |

All 7 constraints are mapped in the filter but have **zero test coverage**.
Run this skill once per row above. Start with `stock_non_negative` (highest severity).

---

Output: RED confirmation · migration verified · filter mapping verified · GREEN confirmation · commit hash
