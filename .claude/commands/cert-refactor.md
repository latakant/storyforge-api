```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-refactor  |  v8.0  |  TIER: 6  |  BUDGET: MODERATE  ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L6 · L7 · L8 · L9                                   ║
║ AUTHORITY     ║ EXECUTOR                                             ║
║ CAN           ║ - Read + write src/ files (structural change only)  ║
║               ║ - Run npx tsc --noEmit                              ║
║               ║ - Run npx jest --verbose                            ║
║               ║ - Write ai/lifecycle/LAYER_LOG.md (REFACTOR)        ║
║ CANNOT        ║ - Change observable behavior (API contracts)        ║
║               ║ - Modify schema.prisma                              ║
║               ║ - Add new features during refactor                  ║
║               ║ - Proceed if tests fail before refactor starts      ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║               ║ - Green test suite BEFORE refactor begins           ║
║ ESCALATES     ║ - Tests fail after refactor → HARD HALT             ║
║               ║ - Contract change needed → HARD HALT                ║
║ OUTPUTS       ║ - Refactored code (behavior unchanged)              ║
║               ║ - Completion block: COMPLETE or HARD HALT           ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Safe structural refactor — extract, rename, reorganize. Behavior must be identical before and after.

$ARGUMENTS

Parse: `target` (required) — file path, function name, or module · `type` — `extract` | `rename` | `split` | `inline` | `reorder`

---

## GATE — Pre-refactor health check

**Must be green before ANY refactor begins.**

```bash
npx tsc --noEmit 2>&1 | tail -5
npx jest --verbose 2>&1 | tail -10
```

If TypeScript errors exist → fix them FIRST. Refactor on broken code = compounding risk.
If tests are failing → do NOT refactor. Fix the failures first.

Record:
```
Pre-refactor state: tsc [✅ clean | ❌ N errors] | tests [✅ N passing | ❌ N failing]
```

If either is red → output HARD HALT.

---

## STEP 1 — SCOPE

Read the target file(s). Understand:
- What does this code currently do?
- What are all callers of the function/class being refactored?
- Is this code exported and consumed by other modules?

```bash
grep -rn "<function-name>\|<class-name>" src/ --include="*.ts" | grep -v ".spec.ts"
```

List all call sites — refactor must update every one of them.

**Contract check:** Does this refactor change any public-facing API (controller routes, DTO shapes, response structures)? If YES → HARD HALT. Contracts are not refactor scope.

---

## STEP 2 — PLAN

State the refactor in one sentence:
```
Refactor: [extract/rename/split/inline] <what> from <source> [into <destination>] — reason: <why>
```

Examples:
- Extract `calculateTax` from `orders.service.ts` into `tax.service.ts` — reason: tax logic used in 3 services
- Rename `getAll` → `findAll` in `products.service.ts` — reason: NestJS convention
- Split `users.service.ts` (400 lines) into `users.service.ts` + `users-auth.service.ts`

List the files that will change:
```
Files touched: [list — must be minimal]
```

If > 5 files → pause and explain scope to user. Get confirmation before proceeding.

---

## STEP 3 — EXECUTE (by refactor type)

### Extract method / service

1. Create the extracted unit in its destination file
2. Verify it has the same signature as before (same params, same return type)
3. Replace original with a call to the new location
4. Update all other callers found in STEP 1

### Rename

1. Use IDE-style rename: find all usages, update all in one pass
2. Update imports everywhere
3. If exported in `index.ts` barrel — update barrel too

### Split file

1. Create the new file with the extracted class/functions
2. Update the original to remove what moved
3. Update all import paths across the codebase

### Inline

1. Find all call sites
2. Replace each call with the inlined code
3. Delete the original function/file if no longer used

**Rules for all types:**
- Never change logic during refactor — even "obvious" improvements
- Never add error handling, logging, or types that weren't there before
- One refactor at a time — do not chain multiple structural changes in one run

---

## STEP 4 — VERIFY (non-negotiable)

```bash
# TypeScript must be clean — same as before
npx tsc --noEmit 2>&1 | tail -5

# All tests must still pass — behavior is unchanged
npx jest --verbose 2>&1 | tail -20

# Check no regressions across full suite
npx jest --verbose 2>&1 | grep -E "FAIL|PASS|Tests:" | tail -10
```

**If any test fails after refactor:**
- Do NOT push
- Diagnose which test broke and why
- Either: (a) fix the import/call site that was missed, or (b) if behavior changed — this is a bug introduced by refactor → HARD HALT

**If TypeScript errors introduced:**
- Fix them — they indicate a caller was missed or a type changed

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-refactor                COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Refactor   [type] — [what changed]
Files      [N files touched]
Behavior   UNCHANGED (all tests green)
Verified   tsc ✅ | tests ✅ | regressions: NONE
Next       /cortex-commit "refactor(<module>): [what changed]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
