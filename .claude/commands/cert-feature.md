<!-- Load ai/core/MASTER-v11.3.md and ai/memory/team-roles.md before executing this skill -->
Execute the full FEATURE: protocol from AI-MANUAL.md.

$ARGUMENTS

---

**STEP 0 — Work type + role classification (always first)**

Read: `ai/memory/team-roles.md` (Work Type Classification section)

Apply the 4-question protocol to the feature request:
- Q1: Production emergency? → HOTFIX (wrong skill — use /cortex-bug)
- Q2: System structure change (new module, schema, env var)? → MIGRATION path — ARCH approval required
- Q3: Anything exist? No → GREENFIELD | Q4: Behaviour changes? No → REFACTOR | Yes → MAINTENANCE

Output:
```
WORK TYPE: <GREENFIELD | MAINTENANCE | MIGRATION>
Reason:    <one line>
Projects:  exena-api: YES/NO | exena-web: YES/NO | exena-admin: YES/NO
Roles:     <list active roles>
PA:        YES (Phase <n>) | NO
```

Update `ai/state/session-state.json`: set `active_work_type`, `active_role` = SENIOR_FULLSTACK, `session_date`.

Log to `ai/ROLE_LOG.md`:
```
[<ISO>] ROLE=SENIOR_FULLSTACK ACTION=PLAN WORK_TYPE=<type> PROJECTS=<list> DETAIL="FEATURE: <description>"
```

If PA required → STOP and present what needs PA approval before proceeding.

---

**STEP 1 — Path classification**
- Read `ai/AI-MANUAL.md` (Three Paths section)
- Read `ai/context/forbidden.md`
  - If not found: apply CLAUDE.md coding standards (no cross-module DB, no circular imports, no `any`)
- Read `ai/context/invariants.md`
  - If not found: use CLAUDE.md critical business rules section instead
- Classify: TRIVIAL / FEATURE / ARCH

If **ARCH path** — stop here and list what requires explicit human approval before proceeding:
- Prisma migrations (`prisma migrate dev`)
- New environment variables
- New external services (Razorpay, Shiprocket, etc.)
- Auth / payment / webhook flow changes
- New module creation
- Destructive DB operations

Do not proceed past Step 1 on ARCH path without "approved" or "go ahead" from the user.

---

**STEP 2 — Ground + Read existing code**

**Run /cert-ground "<feature description>"** — before reading anything manually.

- 🔴 BLOCKED → stop (feature may already exist, or baseline is broken) — resolve first
- ⚠ REVIEW NEEDED → feature or parts of it may already be implemented — adjust scope
- ✅ GROUNDED → proceed with verified file/symbol state as anchor

After grounding:
- Read the related Mermaid diagram in `ai/mermaid/` (cert-ground doesn't cover these)
- Read `ai/app.prd.md` — confirm the feature isn't already specced differently
- Use cert-ground's Ground Truth block instead of re-reading controller/service/DTOs

---

**STEP 3 — Plan first (FEATURE path only — skip for TRIVIAL)**
Output:
- PRD diff: what will be added to `ai/app.prd.md`
- Diagram change: what will change in `00-PROJECT-MASTER.md`
- Files to create or modify (list them)

Wait for user to confirm "OK" or "go ahead" before writing any code on FEATURE path.

---

**STEP 4 — Implement**
- Controller (HTTP only) — parse request, call service, return response
- Service (business logic) — validate rules, $transaction boundary, queue side-effects
- PrismaService — Prisma queries with include/select
- DTOs with class-validator for all inputs
- Guards (JwtAuthGuard, RolesGuard) for all auth endpoints
- No `any` — use `unknown` + type guards
- Explicit return types on all functions

---

**STEP 5 — Verify**
- Run: `npx tsc --noEmit`
- Must pass with 0 errors before continuing.

---

**STEP 6 — Update blueprint**
- Append changelog entry to `ai/app.prd.md`
- Update `ai/mermaid/00-PROJECT-MASTER.md` — Module Health Scorecard if module status changed
- Update the domain-specific Mermaid file if system topology changed

---

**STEP 7 — Update TRACKER**
Append to `ai/TRACKER.md` under today's date:
```
[YYYY-MM-DD] FEATURE_ADDED — [module] — [endpoint or capability added]
```

---

**STEP 8 — Log lifecycle event**
Run: `node scripts/lifecycle.js log --action=FEATURE_ADDED --module=<module> --detail="<what was added>"`

---

**LAYER LOG — append to `ai/lifecycle/LAYER_LOG.md`:**

```
[<ISO timestamp>]
TYPE: BUILD
PROJECT: <exena-api|exena-web|exena-admin>
ROLE: <active_role from ai/state/session-state.json>
LAYER_ORIGIN: <starting layer of the build>
LAYER_FIXED: <primary layer where implementation lives>
LAYERS_TOUCHED: <comma-separated, e.g. L3_DTO, L4_SERVICE, L1_CONTROLLER, L8_TEST>
LAYER_VIOLATED: NONE
FRONTEND_IMPACT: <NONE|LOW|MEDIUM|HIGH>
PA_REQUIRED: <YES Phase n | NO>
CONTRACT: <UNCHANGED|NON_BREAKING|BREAKING>
MODULE: <module>
FILES: <files created or modified>
DETAIL: <one-line description of what was built>
```

---

---

## Completion block (MASTER-v11.3.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-feature                 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files      {n created · n modified}
PA         {YES Phase n — pending review | NO}
Logged     LAYER_LOG (TYPE: BUILD) · {date}
Next       npx tsc --noEmit → /cortex-commit → /cortex-diagram
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If ARCH path detected before implementation:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-feature                 HALTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy     ARCH path — explicit approval required
Attempted  {what was planned}
Blocked    Schema change / new module / new env var
Logged     LAYER_LOG · {date}
PA needed  Review plan above → "approved" to proceed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
