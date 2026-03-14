# /cortex-build — Skill 43
# Domain skeleton generator — spec-driven, invariant-enforced
# Combines domain skill blueprint + procedural skills
# Generates complete domain implementation for any CORTEX-governed project

---

## Usage

```
/cortex-build <domain>

cortex build auth         → full auth domain skeleton
cortex build payment      → payment domain (online + COD)
cortex build webhook      → webhook handler scaffold
cortex build notification → notification system scaffold
cortex build search       → search feature scaffold
cortex build storage      → file upload scaffold
cortex build realtime     → WebSocket feature (future — generates scaffold)
cortex build <custom>     → custom domain skeleton
```

**Note:** When domains are already BUILT, this skill acts as audit/review mode. Use for:
1. New custom domains not yet implemented
2. Rebuilding/refactoring a domain from scratch
3. Generating missing pieces of a partially-built domain
4. Understanding domain structure before modifying it

---

## Step 0: Load

Read: ai/core/MASTER-v7.3.md
Read: ai/memory/DOMAIN_MEMORY.md
Read: ai/memory/INVARIANT_MEMORY.md
Read: ai/memory/ARCHITECTURE_MEMORY.md
Read: ai/memory/DEPENDENCY_MEMORY.md
Read: ai/memory/TRANSACTION_MEMORY.md (if domain has transaction sequences)

Identify domain from argument.
Load domain skill file: ai/skills/domains/<domain>.skill.md

If domain skill not found:
  Check DOMAIN_MEMORY.md for custom domain entry.
  If not found:
    Ask: "No skill file for <domain>.
    Should I:
    A) Build using general patterns (no domain-specific blueprint)
    B) Create a new domain skill file first, then build
    C) Abort"

If domain status in DOMAIN_MEMORY.md is BUILT:
  Output:
    "⚠️ Domain '<domain>' is already BUILT.
    Options:
    A) Show domain structure (no code changes)
    B) Generate missing pieces only
    C) Rebuild from scratch (PA required)
    D) Abort"

Log to ai/ROLE_LOG.md:
  [<timestamp>] ROLE=BACKEND_DEV
  ACTION=DOMAIN_BUILD_START
  DOMAIN=<domain>
  SKILL=ai/skills/domains/<domain>.skill.md
  STATUS=<BUILT|NOT_BUILT>

---

## Step 0.5 — SEARCH FIRST (mandatory before writing any code)

Before generating a single line of code, answer these questions by searching the codebase:

```bash
# 1. Does this module already exist?
ls src/modules/<domain>/ 2>/dev/null

# 2. Is there already a service method that does what's needed?
grep -r "async <methodName>" src/modules/<domain>/

# 3. Is there already a DTO for this input shape?
grep -r "class.*Dto" src/modules/<domain>/

# 4. Does this domain touch finances/orders/inventory?
#    → MUST read TRANSACTION_MEMORY.md before proceeding

# 5. Does another module already provide this functionality?
grep -r "export class.*Service" src/modules/ | grep -v spec
```

If any of the above finds existing code:
- **Reuse** the existing abstraction — do not create a duplicate
- **Extend** the existing service method — do not create a parallel one
- **Import** the existing DTO — do not create a new one with same shape

Also check the adapter skill for this stack (e.g. `nestjs-patterns.md`):
- Read the "COMMON MISTAKES" section before writing controllers/services
- Read the relevant LAW for what you're about to write

**When loading external documentation:**
Try appending `/llms.txt` to any documentation URL first (e.g. `https://docs.nestjs.com/llms.txt`).
Many documentation sites expose a clean, LLM-optimized version — fewer tokens, same information.
If `/llms.txt` returns 404, fall back to the standard URL.

Only after this search phase is complete → proceed to Phase 1.

---

## Phase 1 — Load Domain Intelligence

Read domain skill file completely:
  Load: CRITICAL invariants first (know what halts)
  Load: STANDARD invariants (know what needs PA)
  Load: WARNING invariants (know what to log)
  Load: architecture pattern
  Load: domain skeleton structure
  Load: schema template (if present)
  Load: env vars required
  Load: PA triggers
  Load: common failures + tier mapping

Confirm understanding:
  State which invariants are CRITICAL for this domain.
  State PA triggers that will fire during this build.
  State env vars that must exist (check .env.example).

---

## Phase 2 — Invariant Check

Before writing ANY code:

Check CRITICAL invariants:
  Scan existing codebase for violations.
  If ANY CRITICAL invariant would be violated by build:

    🚨 HARD HALT — CRITICAL INVARIANT
    ════════════════════════════════════
    Domain:    <domain>
    Invariant: <ID> — <name>
    Issue:     <what was detected>

    Execution cannot continue.

    Options:
      OVERRIDE <reason> → continue with reason logged to PA_LOG
      FIX FIRST        → fix issue, then retry cortex build
      ABORT            → stop build
    ════════════════════════════════════

    Wait for input. Do not proceed.

Check STANDARD invariants:
  If triggered: flag PA review needed, continue build.
  Log PA requirement in output.

Check WARNING invariants:
  Log to ai/lifecycle/LAYER_LOG.md.
  Continue build.

---

## Phase 3 — Generate Skeleton

For each file in domain skeleton:
  Read the pattern from skill file.
  Check if file already exists.
  If exists: report conflict → ask merge or skip.
  If not exists: generate with correct:
    Layer placement (L1 Controller → L8 Test)
    Naming convention (project conventions from CLAUDE.md or cortex-config.json)
    Import structure (correct module imports)
    Basic implementation (typed, validated DTOs, explicit return types)
    Invariant enforcement (guards, validation, transaction wrappers)
    Error handling (proper framework exceptions)

Log each file to ai/lifecycle/LAYER_LOG.md:
  TYPE=DOMAIN_BUILD
  DOMAIN=<domain>
  LAYER_ORIGIN=<layer number>
  FILES=<file created>
  PA_REQUIRED=YES|NO

---

## Phase 4 — Schema Update

If domain skill has schema template:
  Read existing schema file.
  Check for model name conflicts.
  If conflict: pause + report + ask merge or rename.
  Propose schema additions (do NOT auto-apply migration).
  Output proposed changes for PA approval.
  Flag: PA Phase 2 review required for schema changes.
  Remind: run migration after PA approval.

---

## Phase 5 — Run Procedural Skills

After skeleton generated:
  For each controller file: check against /dev-backend-endpoint patterns.
  For each service file: check against /dev-backend-context patterns.
  For each test file: generate using /dev-backend-test patterns.
  Run conceptual lint against /dev-frontend-lint rules (if frontend changes).

All procedural skill rules apply:
  Layer violations still blocked.
  Tests still required (minimum: happy path + error path per service method).
  TypeScript strict compliance (no `any`, explicit return types).

---

## Phase 6 — Update Memory

Update ai/memory/DOMAIN_MEMORY.md:
  Mark domain as BUILT (or PARTIALLY_BUILT).
  Record files created.
  Record schema changes (if any).
  Record invariants active for this domain.
  Record timestamp.

Update ai/memory/DEPENDENCY_MEMORY.md:
  If new external service added: add to External Service Dependencies.
  Record new module-level dependencies.

Update ai/memory/TRANSACTION_MEMORY.md:
  If domain has multi-step transaction sequences:
    Add all sequences with steps + rollback plans.
    Mark new invariants that apply.

Update ai/memory/ARCHITECTURE_MEMORY.md:
  Add domain to module architecture section.
  Record any new cross-domain rules.

---

## Phase 7 — Report

```
CORTEX BUILD COMPLETE
═════════════════════
Domain: <domain>
Skill:  ai/skills/domains/<domain>.skill.md

Files created:   <n>
Files modified:  <n>
Schema changes:  YES (pending migration) | NO

Invariants:
  CRITICAL checked: <n> ✅
  STANDARD flags:   <n> (PA review required)
  WARNINGS:         <n> (logged to LAYER_LOG)

PA required: YES | NO
Reason: <if yes — list PA triggers fired>

Tests generated: <n>
TypeScript check: Run `npx tsc --noEmit` to verify

Memory updated:
  DOMAIN_MEMORY.md:       ✅
  TRANSACTION_MEMORY.md:  ✅ (if applicable)
  DEPENDENCY_MEMORY.md:   ✅ (if applicable)
  ARCHITECTURE_MEMORY.md: ✅

Env vars needed (add to .env if not present):
  <list from skill file>

Next steps:
  1. /cortex-diagnose — if any STANDARD flags
  2. npx prisma migrate dev (if schema changes)
  3. /cortex-verify — post-build verification (tsc + tests + secrets + invariants)
  4. /cortex-review — code review gate before commit
  5. /cortex-commit (commit with lifecycle log)
  6. /cortex-diagram (update master diagram)
═════════════════════
```

---

## Notes

- This skill NEVER modifies application code in src/ without explicit consent for each file.
- Schema migrations always require PA approval (ARCH path).
- If domain is already BUILT, this skill acts as a review/audit tool by default.
- All generated code must pass project type-check before commit.
- Always close with `/cortex-commit` to log lifecycle event.

## v7.3 Enhancement: Spec-First Domain Build
Before building domain:
  1. Check if ai/spec/domain/entities/<domain> exists
  2. If YES: load spec + domain skill + ai/generators/generator.md → generate
  3. If NO: run /cortex-spec init for this domain first, then build
Generated code marked: // GENERATED BY CORTEX v7.3 RESPONSE SOVEREIGN

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-build <domain>          COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files      {n created · n modified}
PA         {YES — Phase n (list triggers) | NO}
Schema     {YES — pending migration | NO}
Logged     LAYER_LOG (TYPE: DOMAIN_BUILD) · {date}
Next       /cortex-verify → /cortex-review → /cortex-commit → /cortex-diagram
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If HARD HALT on CRITICAL invariant:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-build <domain>          HALTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy     CRITICAL invariant violation detected
Attempted  Build {domain}
Blocked    {invariant ID} — {what was violated}
PA needed  OVERRIDE <reason> | FIX FIRST | ABORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
