╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cert-enforce  |  v11.3  |  TIER: 1  |  BUDGET: LEAN        ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L0 (Pre-build gate)                                 ║
║ AUTHORITY     ║ ANALYST                                             ║
║ CAN           ║ - Read Cortex adapter patterns (stack + domain)     ║
║               ║ - Read ai/learning/instincts.json (local extensions)║
║               ║ - Filter by module, domain, confidence              ║
║               ║ - Inject active constraints into current session     ║
║               ║ - Surface violations found in staged code           ║
║ CANNOT        ║ - Write code or modify source files                 ║
║               ║ - Modify instincts.json                             ║
║               ║ - Block a build (advisory only — flag, not halt)   ║
║ REQUIRES      ║ - CLAUDE.md (stack detection)                       ║
║               ║ - Module or task description (from $ARGUMENTS)      ║
║ ESCALATES     ║ - Confidence ≥ 0.9 violation → flag as HIGH RISK   ║
║               ║ - Invariant conflict → route to cert-diagnose       ║
║ OUTPUTS       ║ - Active guardrail block for current session        ║
║               ║ - Violation flags if staged code is provided        ║
║               ║ - ENFORCING summary consumed by cert-build/fix      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Close the learning loop: instincts are written by cert-learn, diagnosed by cert-diagnose,
and now **enforced** here — before the first line of code is written.

Run at the start of every cert-build, cert-fix, or cert-feature session.
Can also run standalone: `/cert-enforce <module>` to preview active guardrails.

$ARGUMENTS

Parse from $ARGUMENTS:
- `<module>`               → filter instincts for this module/domain
- `<module> --scan`        → filter + scan staged/recently modified files for violations
- `--all`                  → show all graduated instincts regardless of module
- (blank)                  → load all instincts, ask which module to scope to

---

## STEP 1 — Load Patterns (Two sources — Cortex first, local second)

**SOURCE 1 — Cortex adapter patterns (universal, stack + domain specific)**

Read CLAUDE.md to detect stack and domain. Then load matching Cortex adapter files:

Stack detection → load if exists:
- NestJS project  → read `C:\luv\Cortex\adapters\stack\typescript\backend\nestjs\nestjs-patterns.md`
- NestJS + Prisma → also read `C:\luv\Cortex\adapters\stack\typescript\backend\nestjs\prisma-patterns.md`
- Next.js project → read `C:\luv\Cortex\adapters\stack\typescript\frontend\nextjs\nextjs-patterns.md`

Domain detection → load if exists (check CLAUDE.md §1 TOPOLOGY or module list):
- ecom / orders / payments → read `C:\luv\Cortex\adapters\domains\ecom-india\ecom-payments.md`
- ecom / tax / invoices    → read `C:\luv\Cortex\adapters\domains\ecom-india\ecom-tax.md`
- ecom / coupons           → read `C:\luv\Cortex\adapters\domains\ecom-india\ecom-coupons.md`
- ecom / orders / cart     → read `C:\luv\Cortex\adapters\domains\ecom-india\ecom-orders.md`
- fintech                  → read `C:\luv\Cortex\adapters\domains\fintech\fintech-ledger.md`
- saas / subscriptions     → read `C:\luv\Cortex\adapters\domains\saas\saas-subscriptions.md`

Extract all LAW blocks and anti-pattern tables from adapter files into `adapter_patterns[]`.
These are Cortex-sourced, pre-validated, always active. Confidence = 1.0.

If no adapter files found: note "No adapter patterns loaded" — continue.

---

**SOURCE 2 — Local project instincts (project-specific, not yet in Cortex)**

Read `ai/learning/instincts.json`.

If file does not exist: `local_instincts[] = []` — continue (adapter patterns still active).

Parse all instincts. Build working set:
- `local_instincts[]` — every entry in the file
- `graduated[]` — where `graduated: true`
- `high_confidence[]` — where `confidence ≥ 0.8` (graduated or not)

**HARD RULE:** instincts.json is for patterns NOT already in Cortex adapters.
If an instinct duplicates an adapter pattern → it is redundant (harmless, but flag it).

---

**Merge into single enforcement set:**
`all_patterns[] = adapter_patterns[] + graduated[] + high_confidence[]`

---

## STEP 2 — Filter by Scope

If `<module>` provided, filter working set:

Match instinct to module if ANY of these are true:
- `instinct.module` contains `<module>` (partial match ok)
- `instinct.tags[]` contains `<module>` or a related domain keyword
- `instinct.applies_to[]` is present and includes `<module>`
- Instinct has `scope: global` → always include regardless of module

Confidence thresholds for inclusion:
- `confidence ≥ 0.9` → **CRITICAL guardrail** — always include
- `confidence ≥ 0.7` → **ACTIVE guardrail** — include
- `confidence 0.5–0.69` → **ADVISORY** — include but mark as low-signal
- `confidence < 0.5` → exclude (too noisy, not yet reliable)

---

## STEP 3 — Display Active Guardrails

Output the enforcement block:

```
⚡ CORTEX ENFORCE — [module | ALL] — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL guardrails [confidence ≥ 0.9]:
  ✖ [instinct-id] — [title]
    Rule:    [what must never happen, in one line]
    Pattern: [code smell or anti-pattern to watch for]
    Fix:     [the correct approach]

ACTIVE guardrails [confidence 0.7–0.89]:
  ⚠ [instinct-id] — [title]
    Rule:    [what must never happen]
    Fix:     [the correct approach]

ADVISORY [confidence 0.5–0.69]:
  · [instinct-id] — [title] (low-signal — verify applicability)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENFORCING: [N] critical · [N] active · [N] advisory
These constraints are ACTIVE for this session.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If zero instincts match the filter:
```
⚡ CORTEX ENFORCE — [module]
  No instincts found for this module.
  Build freely — but run /cert-learn after if bugs emerge.
ENFORCING: NONE
```

---

## STEP 4 — Scan (if --scan flag provided)

Read recently modified files in the relevant module:
```bash
git diff --name-only HEAD 2>/dev/null | grep "src/modules/<module>"
# or if no git changes:
ls src/modules/<module>/*.ts 2>/dev/null
```

For each CRITICAL and ACTIVE instinct, scan file contents for the anti-pattern:

| Instinct | What to grep for |
|----------|-----------------|
| `prisma-any-type-elimination` | `: any` near Prisma calls, `findMany\(` with `any` typed result |
| `wrap-order-create-in-transaction` | multi-table writes (`prisma.order.create` + `prisma.payment.create`) NOT inside `$transaction` |
| `p2002-to-conflict-exception` | `catch` blocks that don't check `e.code === 'P2002'` |
| `shiprocket-webhook-signature` | webhook handler methods missing HMAC verification |
| `prisma-queryraw-typed-interface` | `$queryRaw` without explicit return type interface |

For each violation found:
```
🔴 VIOLATION DETECTED — [instinct-id]
   File:    src/modules/<module>/<file>.ts
   Line:    ~[N]
   Pattern: [what was found]
   Fix:     [prescribed fix from instinct]
   Action:  Fix this before proceeding → /cert-fix "[violation description]"
```

For clean files:
```
✅ [instinct-id] — no violation found in scanned files
```

---

## STEP 5 — Session Injection

State clearly which guardrails are now ACTIVE for this session.
These must be treated as hard constraints in any code written during cert-build/fix/feature:

```
SESSION GUARDRAILS ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━
The following rules are enforced for ALL code written in this session:

[For each CRITICAL instinct:]
  ✖ NEVER [anti-pattern] — [instinct title]

[For each ACTIVE instinct:]
  ⚠ ALWAYS [correct pattern] — [instinct title]

Violation of a CRITICAL guardrail = flag before committing.
Violation of an ACTIVE guardrail  = warn + suggest fix.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Completion Block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      cert-enforce
STATUS:     COMPLETE
MODULE:     [module | ALL]
CRITICAL:   [N] guardrails active
ACTIVE:     [N] guardrails active
ADVISORY:   [N] instincts loaded
VIOLATIONS: [N found | NONE]
NEXT:       cert-build | cert-fix | cert-feature
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
