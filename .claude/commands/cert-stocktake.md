╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-stocktake  |  v1.0  |  TIER: 3  |  BUDGET: LEAN    ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L3 · L7                                         ║
║ AUTHORITY     ║ OBSERVER                                             ║
║ CAN           ║ - Read all skill files                               ║
║               ║ - Grep codebase for patterns referenced in skills   ║
║               ║ - Compare skills against git changes                 ║
║ CANNOT        ║ - Modify source files or skills                      ║
║ WHEN TO RUN   ║ - Monthly, or after large refactor                   ║
║               ║ - When a skill gives advice that seems wrong         ║
║               ║ - After major dependency upgrades                    ║
║ OUTPUTS       ║ - Drift report · stale skill list · update plan      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Skill drift detection. Skills can become stale as the codebase evolves.
This skill checks if patterns referenced in skills still match reality.
Run monthly or after major changes to keep the pattern library accurate.

$ARGUMENTS

Parse from $ARGUMENTS:
- `full` — check all skills (default)
- `domain <name>` — check skills for a specific domain (e.g. `domain=orders`)
- `recent` — check only skills whose referenced files changed in last 30 days

---

## STEP 1 — Inventory skills

```bash
ls adapters/nestjs/ adapters/nextjs/ adapters/shared/ skills/
```

For each skill file, extract the patterns it references:
- File paths mentioned (e.g. `src/modules/auth/`)
- Code patterns mentioned (e.g. `PrismaService`, `JwtAuthGuard`)
- Module names (e.g. `OrdersService`, `PaymentsController`)

---

## STEP 2 — Check each skill against codebase

For each pattern referenced in a skill:

```bash
# Check if referenced file still exists
ls src/modules/<referenced-module>/

# Check if referenced pattern still exists in code
grep -r "<pattern>" src/ --include="*.ts" | head -5

# Check if referenced import path is still valid
grep -r "from '<import-path>'" src/ --include="*.ts" | head -3
```

Flag as STALE if:
- Referenced module/file no longer exists
- Referenced class/service has been renamed
- Referenced pattern contradicts current implementation
- Referenced import path is no longer used

Flag as WARN if:
- Referenced file exists but pattern not found (may have changed)
- Skill describes a pattern that has a newer alternative in codebase

---

## STEP 3 — Quick diff against recent git changes

```bash
# Files changed in last 30 days
git log --since="30 days ago" --name-only --pretty=format: | sort -u | grep "\.ts$"
```

For each changed file, check if a skill references it.
If skill references a recently-changed file → flag for manual review.

---

## STEP 4 — Generate drift report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-stocktake          DRIFT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skills checked: N
Skills stale:   N
Skills warn:    N
Skills current: N

STALE (requires update):
  adapters/nestjs/dev-backend-auth.md
    - References `src/modules/auth/strategies/` — path has changed to `src/modules/auth/guards/`
    - References `PassportStrategy` — now using `JwtStrategy` directly

  skills/cert-verify.md
    - References `npx jest --testPathPattern` — project now uses `npx jest --testNamePattern`

WARN (review recommended):
  adapters/nestjs/nestjs-patterns.md
    - References pattern from 6 months ago; auth module refactored since

CURRENT:
  adapters/nestjs/prisma-patterns.md ✔
  skills/cert-orchestrate.md ✔
  ... (N more)

RECOMMENDATIONS:
  1. Update dev-backend-auth.md — path correction (10 min)
  2. Update cert-verify.md — command flag correction (5 min)
  3. Review nestjs-patterns.md against current auth implementation (30 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: address STALE items, then re-run /cortex-stocktake to confirm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## COMPLETION

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-stocktake              COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Drift found: {YES/NO}
Stale:       {N skills}
Next run:    {in 30 days, or after next major refactor}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
