TDD cycle — Red → Green → Refactor for a NestJS service method.

$ARGUMENTS

Parse: `module` (required) · `method` (required) · `behavior` (what it should do — in plain English)
Example: `orders create — should decrement stock inside $transaction`

---

## PHILOSOPHY

Write the test FIRST. The test is the specification.
Code exists to make the test pass — nothing more.
If you cannot write the test before the code, the requirement is unclear. Stop and clarify.

TDD cycle:
```
RED   → Write a failing test that describes the exact behavior
GREEN → Write the minimum code to make it pass (no more)
CHECK → Run tests — must pass, no other tests broken
CLEAN → Refactor if needed — run again to verify still green
LOCK  → Commit test + implementation together
```

---

## STEP 1 — RED: Write the failing test

**Read the service file first:**
`src/modules/<module>/<module>.service.ts`

**Read the existing spec file (if exists):**
`src/modules/<module>/<module>.service.spec.ts`
Note the mock setup pattern already in use. Match it exactly.

**Write ONE failing test** that specifies the exact behavior from `$ARGUMENTS`.

Test anatomy:
```typescript
describe('<method>', () => {
  it('should <behavior in plain English>', async () => {
    // ARRANGE — set up exactly what the method needs
    // (mock only what this specific method calls — no over-mocking)

    // ACT — call the method
    const result = await service.<method>(...)

    // ASSERT — verify behavior, not implementation
    expect(result).<matcher>
    // If financial: ALSO assert $transaction was called
    // If DB write: ALSO assert the exact Prisma call args
  })
})
```

**Run immediately — it MUST fail:**
```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -20
```

If the test passes without any implementation change → the test is wrong (testing nothing).
Fix the test until it fails for the right reason.

**Record the failure reason:**
```
RED CONFIRMED: [paste exact failure line]
Fails because: [describe why — "method doesn't exist" / "returns wrong value" / "missing guard"]
```

---

## STEP 2 — GREEN: Write minimum implementation

Open: `src/modules/<module>/<module>.service.ts`

Write the **minimum code** to make the test pass.
- Do NOT add error handling that isn't tested yet
- Do NOT add related features that aren't tested yet
- Do NOT generalize prematurely
- If the test only checks happy path → implement only happy path

**Run again — must pass:**
```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -20
```

Also run the full suite to ensure nothing regressed:
```bash
npx jest --verbose 2>&1 | tail -10
```

If any other test broke → fix the regression before proceeding.

**Record:**
```
GREEN CONFIRMED: [N] tests passing, 0 failing
Lines added: [N]
```

---

## STEP 3 — CLEAN: Refactor if needed

Ask: is the implementation messy, duplicated, or unclear?
- If YES → refactor now (rename, extract, simplify) — then run tests again
- If NO → skip this step

**Do not add new behavior during CLEAN.** Behavior is frozen until the next RED step.

Run after any refactor:
```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -10
```

---

## STEP 4 — NEXT RED (repeat for each scenario)

For the same method, write the NEXT failing test. Priority order:

```
1. Happy path (if not yet written)
2. Not found → NotFoundException         (if method reads from DB)
3. Conflict → ConflictException          (if method writes to DB with unique constraint)
4. Auth/ownership violation              (if method has userId check)
5. Business rule violation               (e.g., cancel only PENDING orders)
6. Financial path: $transaction called   (if method touches money/stock/coupons — MANDATORY)
7. Constraint violation: P2004           (if method decrements stock or enforces DB CHECK)
8. Edge cases                            (empty list, zero quantity, boundary values)
```

Repeat STEP 1 → STEP 3 for each scenario.

---

## STEP 5 — COVERAGE CHECK

```bash
npx jest --testPathPattern=<module> --coverage 2>&1 | grep -A 20 "<module>"
```

Every branch of the method under test must appear in the coverage report.
Uncovered branch = untested behavior = hidden bug.

---

## STEP 6 — FINAL CHECKS

```bash
npx tsc --noEmit           # TypeScript must be clean
npx jest --verbose         # Full suite must pass
```

---

## STEP 7 — COMMIT

Use `/cortex-commit`:
```
test(<module>): TDD — <method> — [N] scenarios (red→green)
```

Commit includes BOTH the test and the implementation.
Never commit only one without the other.

---

## CONSTRAINT VIOLATIONS IN TDD

For any method that:
- Decrements stock → add P2004 test (use `/dev-tdd-constraint`)
- Creates with unique field → add P2002 test
- Touches money inside $transaction → add rollback test

These are not optional. They are L1 invariants in this codebase.
If a financial method has no $transaction test → it is not done.

---

## WHAT NOT TO DO

❌ Write tests after the code is done — that's not TDD, that's coverage theatre
❌ Write multiple tests before running any — you lose the RED confirmation
❌ Mock everything — over-mocked tests test nothing
❌ Test implementation details (which internal function was called) — test behavior
❌ Write code to pass multiple failing tests at once — one RED at a time

---

Output: RED confirmation · GREEN confirmation · scenario count · coverage % · commit hash
