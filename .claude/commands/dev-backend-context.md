# /dev-backend-context — NestJS Adapter (Skill: Backend Context Loader)
# ADAPTER: Requires NestJS + Prisma (or other ORM) backend project.
# Load backend development context for a focused NestJS session.

$ARGUMENTS

Parse from $ARGUMENTS: module name (optional). If provided, deep-loads that module.

---

**STEP 1 — Load enterprise rules (always)**
- Read `ai/memory/enterprise-standards.md` — NestJS patterns, error mapping, typing rules
  - If file not found: use CLAUDE.md coding standards section instead. Note: "enterprise-standards.md not found — using CLAUDE.md standards. Run /cortex-init to create it."
- Read `ai/context/invariants.md` — L1–L5 business rules that cannot be violated
  - If file not found: use CLAUDE.md critical business rules section instead.
- Read `ai/context/forbidden.md` — no circular deps, no cross-module DB access, no `any`
  - If file not found: apply default prohibitions from CLAUDE.md coding standards.

---

**STEP 2 — Load module dependency map**
- Read `ai/mermaid/10-module-dependencies.md` — what imports what, forbidden deps
- Note: Read project's CLAUDE.md for Global module rules (e.g., MailerModule if present)

---

**STEP 3 — Load target module (if specified)**
If a module name is in $ARGUMENTS, read these files:
```
src/modules/<module>/<module>.controller.ts   → existing routes + guards
src/modules/<module>/<module>.service.ts      → business logic + DB calls
src/modules/<module>/<module>.module.ts       → imports, providers, exports
src/modules/<module>/dto/                     → all DTO files (scan)
src/modules/<module>/<module>.service.spec.ts → existing test coverage
```

---

**STEP 4 — Load relevant ORM models**
- Read schema file (e.g., `prisma/schema.prisma`) — focus on models for the target module
- Hold schema rules from CLAUDE.md in memory (PK strategy, soft delete pattern, naming conventions)

---

**STEP 5 — Load open issues for this module**
- Read `ai/state/open-issues.json` — filter for target module
- Read `ai/fixes/applied/FIX_LOG.md` (last 10 lines) — recent changes

---

Output this Backend Context Brief:

```
BACKEND CONTEXT — [module or general] — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stack:     NestJS · {ORM} · TypeScript — from CLAUDE.md
Pattern:   Controller (HTTP only) → Service (logic) → {ORM}Service (DB)
Guards:    JwtAuthGuard → RolesGuard → Controller (order is mandatory)
Schema:    [PK strategy · soft delete · naming] — from CLAUDE.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Module:    [name — endpoints, models, key business rule]
Open issues: [from ai/state/open-issues.json or None]
Recent fix:  [from FIX_LOG.md or None]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Available dev skills:
  /dev-backend-endpoint  → add a new API endpoint
  /dev-backend-schema    → schema change (ARCH)
  /dev-backend-test      → write or fix unit tests
  /dev-backend-debug     → debug NestJS-specific issue
```
