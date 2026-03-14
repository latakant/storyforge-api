# Development Workflow

## Feature Implementation Pipeline

### 0. Research First (MANDATORY before writing anything)
- Grep existing codebase for similar patterns before writing new code
- Check if the feature already exists in another module
- Read the relevant domain skill (ecom-orders, ecom-payments, etc.)

### 1. Plan (ARCH path)
- Use `planner` agent for features touching 3+ files or 2+ modules
- Produce implementation plan with phases, file paths, and dependencies
- **Wait for human approval before writing any code**

### 2. TDD (required)
- Use `tdd-guide` agent
- Write tests FIRST (RED) → implement (GREEN) → refactor (IMPROVE)
- 80%+ coverage before moving on

### 3. Review
- Use `code-reviewer` agent immediately after writing code
- Fix all CRITICAL and HIGH findings before proceeding
- Run `/cortex-verify` to confirm no regressions

### 4. Commit
- Run `/cortex-commit` — conventional format, lifecycle logged

## Agent Trigger Rules

| Situation | Agent to invoke |
|-----------|----------------|
| Complex feature (3+ files) | `planner` |
| Any architectural decision | `architect` |
| Writing new feature code | `tdd-guide` |
| After any code change | `code-reviewer` |
| Auth/payment/webhook code | `security-reviewer` |
| Build fails | `build-error-resolver` |

## Parallel Execution

ALWAYS parallel for independent operations:
```
GOOD: Review auth module + review orders module simultaneously
BAD: Review auth → wait → review orders (sequential when independent)
```

Use `cortex-parallel` for 3+ independent tasks.
