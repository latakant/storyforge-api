---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Coding Style

> Extends common/coding-style.md with TypeScript-specific rules.

## No `any` — Ever

```typescript
// WRONG
function process(data: any) { ... }

// CORRECT
function process(data: unknown) {
  if (!isValidData(data)) throw new Error('Invalid data');
  const typed = data as ValidType;
  ...
}
```

## Immutability with Spread

```typescript
// WRONG: mutation
function updateUser(user: User, name: string): User {
  user.name = name;  // mutation!
  return user;
}

// CORRECT: spread
function updateUser(user: User, name: string): User {
  return { ...user, name };
}
```

## Explicit Return Types

All functions must have explicit return types:
```typescript
// WRONG
async function findUser(id: string) { ... }

// CORRECT
async function findUser(id: string): Promise<User | null> { ... }
```

## Interface vs Type

- `interface` for object shapes that may be extended
- `type` for unions, intersections, primitives, and utility types

```typescript
interface UserProfile { id: string; name: string; }  // extendable shape
type UserRole = 'ADMIN' | 'CUSTOMER' | 'SUPER_ADMIN';  // union
type Optional<T> = T | null | undefined;  // utility
```

## Error Handling

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ConflictException('Already exists');
    if (error.code === 'P2025') throw new NotFoundException('Not found');
  }
  throw error;  // re-throw unexpected errors
}
```

## No console.log in Production

Use NestJS Logger or MonitoringLogger:
```typescript
private readonly logger = new Logger(ServiceName.name);
this.logger.log('User registered', { userId });  // structured
this.logger.error('DB error', error.stack);       // with stack
```
