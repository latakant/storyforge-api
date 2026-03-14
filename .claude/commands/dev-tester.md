Test engineer — audit coverage, write missing tests, fix failures, track improvements.

$ARGUMENTS

Parse: module name (or "all" for full project audit). Mode: "audit" (gaps only) | "write" (add tests) | "fix" (fix failures) | blank (audit + write).

---

## PHASE 1 — TESTING CONTEXT LOAD

**Load what needs to be tested:**
Read: `src/modules/<module>/<module>.service.ts`
Extract every public method: name, parameters, return type, exceptions thrown, Prisma calls.

**Load what's already tested:**
Read: `src/modules/<module>/<module>.service.spec.ts`
Note: mock setup pattern, which methods have tests, which scenarios are covered.

**Load business rules that MUST be tested:**
Read: `ai/context/invariants.md` — L1–L5 invariants relevant to this module.
Every invariant has at least one test. Non-negotiable.

**Current test count:** Run `npx jest --testPathPattern=<module> --verbose 2>&1 | tail -5`

---

## PHASE 2 — COVERAGE AUDIT

For each public service method, produce this table:

```
COVERAGE AUDIT — <module>.service.ts — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Method              Happy  P2025  P2002  Biz Rule  Edge    Priority
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
create<Entity>       ✅     —      ✅     —         ❌      HIGH
findById             ✅     ✅     —      —         ❌      MED
update               ❌     ❌     ❌     —         —       HIGH
delete               ✅     ✅     —      —         —       LOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coverage:  [X/Y methods] fully covered | [N] scenarios missing
Invariants: [list L1-L5 invariants for this module — tested: yes/no]
```

Priority rules:
- No test at all → **HIGH** (write happy path + all error paths)
- Financial method (touches money/orders/payments) → **HIGH** regardless of existing coverage
- Missing error path only → **MED**
- Missing edge case only → **LOW**

If mode = "audit" → stop here, report gaps.

---

## PHASE 3 — WRITE MISSING TESTS

Write in priority order (HIGH first).

**Standard NestJS service test structure:**

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { <Module>Service } from './<module>.service'
import { PrismaService } from '../../prisma/prisma.service'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

describe('<Module>Service', () => {
  let service: <Module>Service
  let mockPrismaService: jest.Mocked<PrismaService>

  beforeEach(async () => {
    mockPrismaService = {
      <model>: {
        findUnique: jest.fn(),
        findMany:   jest.fn(),
        create:     jest.fn(),
        update:     jest.fn(),
        delete:     jest.fn(),
        upsert:     jest.fn(),
        count:      jest.fn(),
      },
      $transaction: jest.fn(),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Module>Service,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile()

    service = module.get<<Module>Service>(<Module>Service)
  })

  afterEach(() => jest.clearAllMocks())
```

**Scenario templates:**

```typescript
  // ─── Happy path ───────────────────────────────────────────────
  describe('create<Entity>', () => {
    it('should create and return <entity>', async () => {
      const mockEntity = { id: 'cuid-123', name: 'Test', createdAt: new Date(), updatedAt: new Date() }
      mockPrismaService.<model>.create.mockResolvedValue(mockEntity)

      const result = await service.create<Entity>({ name: 'Test' }, 'user-123')

      expect(result).toEqual(mockEntity)
      expect(mockPrismaService.<model>.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Test' }) })
      )
    })

  // ─── P2002 — Conflict ─────────────────────────────────────────
    it('should throw ConflictException on duplicate', async () => {
      mockPrismaService.<model>.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5.0.0' })
      )
      await expect(service.create<Entity>({ name: 'Test' }, 'user-123'))
        .rejects.toThrow(ConflictException)
    })
  })

  // ─── P2025 — Not Found ────────────────────────────────────────
  describe('findById', () => {
    it('should return <entity> when found', async () => {
      const mockEntity = { id: 'cuid-123', name: 'Test' }
      mockPrismaService.<model>.findUnique.mockResolvedValue(mockEntity)
      const result = await service.findById('cuid-123')
      expect(result).toEqual(mockEntity)
    })

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.<model>.findUnique.mockResolvedValue(null)
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── Business rule ────────────────────────────────────────────
  describe('cancelOrder', () => {
    it('should throw BadRequestException when order is not PENDING', async () => {
      const confirmedOrder = { id: 'order-123', status: 'CONFIRMED', userId: 'user-123' }
      mockPrismaService.order.findUnique.mockResolvedValue(confirmedOrder)
      await expect(service.cancelOrder('order-123', 'user-123'))
        .rejects.toThrow(BadRequestException)
    })
  })

  // ─── Edge cases ───────────────────────────────────────────────
  describe('findAll', () => {
    it('should return empty array when no records exist', async () => {
      mockPrismaService.<model>.findMany.mockResolvedValue([])
      const result = await service.findAll()
      expect(result).toEqual([])   // must be [] not null
    })
  })

  // ─── $transaction ─────────────────────────────────────────────
  describe('createOrder (financial method)', () => {
    it('should run inside a $transaction', async () => {
      mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockPrismaService))
      // ... setup mocks for inner prisma calls
      await service.createOrder(mockDto, 'user-123')
      expect(mockPrismaService.$transaction).toHaveBeenCalled()
    })

    it('should restore stock on transaction failure', async () => {
      mockPrismaService.$transaction.mockRejectedValue(new Error('DB timeout'))
      await expect(service.createOrder(mockDto, 'user-123')).rejects.toThrow()
      // verify stock was not permanently decremented
    })
  })
```

**Financial method extra requirements (L1 invariant — always test):**
- Verify `$transaction` is called
- Verify stock/coupon/payment state is consistent on failure (rollback implied by transaction)

---

## PHASE 4 — RUN AND FIX FAILURES

Run: `npx jest --testPathPattern=<module> --verbose`

For each failing test:
- Is the test wrong? (wrong mock setup, wrong expected value) → fix the test
- Is the source code wrong? (real bug) → **STOP. Use `/dev-debugger` for this.**
  - Do not fix source code while in tester mode. Separate concerns.

Run again until all pass.

---

## PHASE 5 — COVERAGE REPORT

Run: `npx jest --testPathPattern=<module> --coverage`

```
TEST RESULT — <module> — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tests:       [before] → [after] (+N new)
Methods:     [X/Y] fully covered
Invariants:  [X/Y] L1-L5 rules have test coverage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Still missing (next session):
  - [method]: [which scenario]
  - [method]: [which scenario]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All tests passing: [yes/no]
```

---

## PHASE 6 — CLOSE

Append to `ai/TRACKER.md`:
```
[YYYY-MM-DD] TESTS — <module> — +[N] tests. [X/Y] methods covered. Invariants: [X/Y].
```

Use `/cortex-commit` with: `test(<module>): add [N] cases — [method list] — [X/Y] methods covered`

Update `ai/learning/skill-usage.json`:
- Increment `invocations.cortex-score.count` (tester implicitly validates code quality)

---

## Tester Scope Reference

| What | Where | Test file |
|------|-------|-----------|
| Backend business logic | `src/modules/<m>/<m>.service.ts` | `<m>.service.spec.ts` |
| Frontend (not yet covered) | `exena-web/src/` | No test files yet — noted gap |
| Integration (noted gap) | Backend + real DB | Not implemented — CLAUDE.md gap |
| E2E (noted gap) | API → DB round trip | Not implemented — CLAUDE.md gap |

> Backend unit tests: full NestJS mock pattern (this skill).
> Frontend tests, integration, E2E: future work noted in CLAUDE.md Backend Score gap.

---

Output: coverage audit table | tests written (count by scenario type) | all passing | still-missing list
