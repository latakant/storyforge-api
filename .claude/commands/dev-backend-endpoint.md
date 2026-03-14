Add a new API endpoint to an existing NestJS module.

$ARGUMENTS

Parse: HTTP method, path, auth level (public/auth/admin), module name, brief description.

---

**STEP 1 — Pre-flight checks**
- Read `ai/context/forbidden.md` — no circular deps, no cross-module DB access
- Read `ai/context/invariants.md` — which L1–L5 invariants apply to this endpoint?
- Read `src/modules/<module>/<module>.controller.ts` — understand existing routes + guards
- Read `src/modules/<module>/<module>.service.ts` — understand existing service methods

---

**STEP 2 — Define the API contract (output before writing code)**

```
Endpoint:     [METHOD] /api/[path]
Auth:         [Public | @UseGuards(JwtAuthGuard) | @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)]
Request DTO:  [DtoName] { field: type (validator) }
Response:     [shape] or { data: T[], meta: { total, page, limit, totalPages } }
Errors:       400 (validation) | 401 (no token) | 403 (wrong role) | 404 (not found) | 409 (conflict)
Business rule: [what this endpoint does in one sentence]
```

Wait for "OK" on the contract before writing a single line of code.

---

**STEP 2b — RED: Write the failing test BEFORE any implementation**

Use `/dev-tdd <module> <method> <behavior>` OR write inline:

```typescript
// src/modules/<module>/<module>.service.spec.ts
describe('<method>', () => {
  it('should <happy path from contract>', async () => {
    // Arrange
    mockPrismaService.<model>.<operation>.mockResolvedValue(mockEntity)
    // Act
    const result = await service.<method>(mockDto, mockUserId)
    // Assert
    expect(result).<matcher>
  })

  // Add error paths from the contract's "Errors:" line
  it('should throw NotFoundException when record not found', async () => {
    mockPrismaService.<model>.findUnique.mockResolvedValue(null)
    await expect(service.<method>('nonexistent', mockUserId)).rejects.toThrow(NotFoundException)
  })
})
```

Run immediately — **must fail (RED):**
```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -10
```

If test passes before any implementation → the test is wrong. Fix it until it fails.
Record: `RED CONFIRMED: [failure reason]`

**If this endpoint touches stock / payments / coupons → also run `/dev-tdd-constraint` for each constraint.**

Only proceed to Step 3 after RED is confirmed.

---

**STEP 3 — Build in strict order (never reverse)**

**3a — DTO first** (`src/modules/<module>/dto/create-<entity>.dto.ts`)
```typescript
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator'

export class Create<Entity>Dto {
  @IsString()
  name: string

  @IsOptional()
  @IsNumber()
  price?: number
}
```
Rules:
- Every field decorated with class-validator
- No `any` — explicit types only
- `@IsOptional()` before type decorator on optional fields
- Separate: CreateDto / UpdateDto (with `@IsOptional()` on all) / QueryDto (for filters)

**3b — Service method** (`src/modules/<module>/<module>.service.ts`)
```typescript
async create<Entity>(dto: Create<Entity>Dto, userId: string): Promise<<Entity>> {
  try {
    return await this.prisma.<model>.create({ data: { ...dto, userId } })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException('<Entity> already exists')
      if (error.code === 'P2025') throw new NotFoundException('<Entity> not found')
    }
    throw error
  }
}
```
Rules:
- Explicit return type on every method
- `$transaction` for any multi-table write
- Catch P2002 → ConflictException, P2025 → NotFoundException
- Return `[]` not `null` for list methods
- Queue side-effects (email, notifications) — never inline

**3c — Controller route** (`src/modules/<module>/<module>.controller.ts`)
```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async create(
  @Body() dto: Create<Entity>Dto,
  @CurrentUser() user: User,
): Promise<<Entity>> {
  return this.service.create<Entity>(dto, user.id)
}
```
Rules:
- Controller is HTTP-only — parse, call service, return result
- No business logic in controller
- `@CurrentUser()` decorator for authenticated user, never read token manually

**3d — Module registration** (only if new provider needed)
Update `<module>.module.ts` — add to `providers` or `imports` if needed.

---

**STEP 4 — TypeScript verification**
Run: `npx tsc --noEmit`
Must pass with 0 errors. Fix any errors before continuing.

---

**STEP 5 — GREEN: Verify all tests pass**

The tests were already written in Step 2b. Run them now against the real implementation:

```bash
npx jest --testPathPattern=<module> --verbose 2>&1 | tail -20
```

All tests written in Step 2b must now be GREEN.
If any fail → fix the implementation (not the test — the test is the spec).
Run the full suite to confirm no regressions:
```bash
npx jest --verbose 2>&1 | tail -10
```

---

**STEP 6 — Update CORTEX documentation**
- Append to `ai/app.prd.md` changelog: `[YYYY-MM-DD] FEATURE_ADDED — <module> — [METHOD] /api/[path]`
- Update CLAUDE.md endpoint count (103 → N) if public endpoint added
- Update `ai/mermaid/00-PROJECT-MASTER.md` if module health scorecard changes

---

**STEP 7 — Commit via CORTEX**
Use `/cortex-commit` with message: `feat(<module>): add [METHOD] /api/[path] [brief description]`

---

**LAYER LOG — append to `ai/lifecycle/LAYER_LOG.md`:**

```
[<ISO timestamp>]
TYPE: BUILD
PROJECT: exena-api
ROLE: BACKEND_DEV
LAYER_ORIGIN: L3_DTO
LAYER_FIXED: L4_SERVICE
LAYERS_TOUCHED: L3_DTO, L4_SERVICE, L1_CONTROLLER, L2_GUARD, L8_TEST
LAYER_VIOLATED: NONE
FRONTEND_IMPACT: <NONE|LOW|MEDIUM|HIGH — assess if frontend needs to consume this endpoint>
PA_REQUIRED: <YES Phase 2 if ARCH | NO>
CONTRACT: <NON_BREAKING|BREAKING — new endpoint is always NON_BREAKING>
MODULE: <module>
FILES: <dto file, service file, controller file, spec file>
DETAIL: feat(<module>): add [METHOD] /api/[path] — <brief description>
```

---

Output: contract defined | DTO created | service method | controller route | test added | tsc passing | committed
