# Testing Requirements

## Minimum Coverage: 80%

Higher bars:
- Financial logic (order totals, payments, coupons): **100%**
- Auth code (JWT, OTP, guards): **100%**
- Webhook handlers: **100%**

## TDD Workflow (MANDATORY)

1. **RED** — Write failing test first. Run it. It MUST fail.
2. **GREEN** — Write minimal implementation to pass. Run it. It MUST pass.
3. **IMPROVE** — Refactor. Tests MUST stay green.
4. **VERIFY** — Check coverage: 80%+ lines/branches/functions.

Never write implementation before tests. No exceptions.

## Test Types (ALL required)

| Type | What | Framework |
|------|------|-----------|
| Unit | Service methods with mocked Prisma | Jest + jest-mock-extended |
| Integration | Controller → Service → DB | Jest + test database |
| E2E | Critical user flows | Playwright (see dev-e2e) |

## Edge Cases (ALWAYS cover)

- Null/undefined inputs
- Empty arrays and strings
- Boundary values (min/max amounts, page limits)
- Error paths: P2002 (duplicate), P2025 (not found), network failures
- Concurrent operations (race conditions)

## Agent Support

Use `tdd-guide` agent when:
- Writing tests for a new feature
- Coverage drops below threshold
- Unsure how to mock a complex dependency
