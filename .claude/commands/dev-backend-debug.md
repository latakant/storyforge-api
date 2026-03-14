Debug a NestJS backend issue — systematic triage before any code changes.

$ARGUMENTS

Description of the issue, error message, or requestId from System 1 logs.

---

**STEP 1 — Use System 1 first (if requestId available)**
If $ARGUMENTS contains a requestId:
- Run: `node scripts/diagnose.js --id=<requestId>`
- KNOWN pattern → follow pattern's resolution steps, then jump to Step 5
- UNKNOWN → continue to Step 2

---

**STEP 2 — Triage the failure type**

Identify which subsystem is failing:

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| HTTP 500 | Unhandled exception / missing P2xxx catch | Service + GlobalExceptionFilter |
| HTTP 401 | JWT invalid / expired / missing | `auth/guards/jwt-auth.guard.ts` |
| HTTP 403 | Wrong role / guard order | `RolesGuard` + controller decorator order |
| HTTP 400 | DTO validation failed / whitelist stripping | DTO class + class-validator decorators |
| HTTP 404 | Route not registered / entity not found | Module imports + service null check |
| HTTP 409 | P2002 not caught / duplicate state check missing | Service P2002 handler |
| Queue job failing | Processor not re-throwing / DLQ missing | `src/shared/queue/` + processor file |
| NestJS DI error | Missing provider / circular dependency | `.module.ts` imports + providers |
| Prisma error | Uncaught P-code | Service try/catch block |
| Type error at runtime | `any` slipping through / wrong cast | TypeScript types in service |

---

**STEP 3 — Read the failing code**

Based on triage, read the relevant files:
- HTTP errors → `src/modules/<module>/<module>.controller.ts` + `<module>.service.ts`
- Guard failure → `src/modules/auth/guards/` + check decorator order on controller
- DI error → `src/modules/<module>/<module>.module.ts` — check providers + imports arrays
- Queue failure → `src/shared/queue/` + relevant `.processor.ts` file
- Prisma error → find the exact Prisma call, look at the P-code

---

**STEP 4 — Apply the fix**

Common fixes:
```typescript
// Missing P2002 catch
if (error.code === 'P2002') throw new ConflictException('Already exists')

// Missing P2025 catch
if (error.code === 'P2025') throw new NotFoundException('Not found')

// Guard order wrong (MUST be: JwtAuthGuard first, then RolesGuard)
@UseGuards(JwtAuthGuard, RolesGuard)

// Floating promise (missing await)
await this.notificationsService.create(...)

// MailerModule imported directly (forbidden — it's Global)
// Remove MailerModule from imports[], inject MailerService directly in providers

// Queue processor not re-throwing (BullMQ won't retry)
@OnWorkerEvent('failed') onFailed(...) { this.logger.error(...) }
// AND in process(): throw error (not just log it)
```

Minimal fix only — no refactoring while debugging.

---

**STEP 5 — Verify**
- Run: `npx tsc --noEmit` — 0 errors
- Run: `npx jest --testPathPattern=<module> --passWithNoTests` — tests pass

---

**STEP 6 — Complete via CORTEX**
Use `/cortex-bug` with the bug description.
This handles: FIX_LOG entry, TRACKER update, lifecycle log, pattern intelligence check.

---

Output: failure type | subsystem (guard/DI/Prisma/queue/validation) | root cause | fix applied | tsc passing
