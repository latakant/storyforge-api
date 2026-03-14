# Coding Style — Universal Rules

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones.

```typescript
// WRONG: mutation
user.name = name;
array.push(item);

// CORRECT: immutable
const updated = { ...user, name };
const newArray = [...array, item];
```

Rationale: Prevents hidden side effects, enables safe concurrency, simplifies debugging.

## File Organization

- 200–400 lines: typical
- 800 lines: hard maximum — extract before exceeding
- One responsibility per file — high cohesion, low coupling
- Organize by domain/feature, not by type

## Functions

- Max 50 lines per function
- Max 4 levels of nesting — use early returns instead:

```typescript
// WRONG: deep nesting
if (user) {
  if (user.active) {
    if (user.email) {
      processUser(user);
    }
  }
}

// CORRECT: early returns
if (!user || !user.active || !user.email) return;
processUser(user);
```

## Error Handling

- Handle errors explicitly at every level
- NEVER silently swallow errors (empty catch blocks)
- Log detailed context server-side, user-friendly message client-side
- No raw 500s for expected errors

## Input Validation

- Validate ALL user input at system boundaries
- Fail fast with clear error messages
- Never trust external data (user input, API responses, file content)

## Code Quality Checklist

Before marking work complete:
- [ ] No `any` type (use `unknown` + guards)
- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] No deep nesting (> 4 levels)
- [ ] Proper error handling — no empty catches
- [ ] No hardcoded values (use constants or env vars)
- [ ] Immutable patterns — no mutation
- [ ] No `console.log` in production code
