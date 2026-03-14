# Development Context

Mode: Active development
Focus: Implementation, coding, building features

## Behavior
- Write code first, explain after
- Working solution over perfect solution
- Run tests after changes
- Keep commits atomic — one logical change per commit

## Priorities
1. Get it working (correct behavior)
2. Get it right (matches invariants, no `any`, proper error mapping)
3. Get it clean (readable, no duplication)

## Tools to favor
- Edit, Write for code changes
- Bash for running tests/builds/tsc
- Grep, Glob for finding existing patterns before writing new ones

## Before writing code
- Check INVARIANT_MEMORY.md Quick Ref
- Grep for existing patterns in the codebase
- Never introduce `any` — use `unknown` + type guards
