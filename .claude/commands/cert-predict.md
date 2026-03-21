```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-predict  |  v8.0  |  TIER: 9  |  BUDGET: MODERATE   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L4 · L9                                        ║
║ AUTHORITY     ║ ANALYST                                              ║
║ CAN           ║ - Read all src/ files                               ║
║               ║ - Read ai/state/ · ai/learning/                     ║
║               ║ - Write ai/state/open-issues.json (append risk)     ║
║               ║ - Write ai/lifecycle/LAYER_LOG.md (PREDICT)         ║
║ CANNOT        ║ - Modify any src/ files                             ║
║               ║ - Run migrations or commands                         ║
║ REQUIRES      ║ - MASTER-v11.3.md loaded                            ║
║ OUTPUTS       ║ - RISK PREDICTION REPORT                            ║
║               ║ - Completion block: COMPLETE or PARTIAL             ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Predict risk areas before a release — concurrency issues, missing guards, untested paths. Read-only.

$ARGUMENTS

Parse: `scope` — `release` | `feature:<name>` | `module:<name>` | blank = full project

---

## PREDICTION CATEGORIES

### CONCURRENCY RISKS
Look for:
- Multiple writes to the same row without SELECT FOR UPDATE or transaction isolation
- `findUnique` → `update` pattern without `$transaction` (TOCTOU race)
- Queue processors without idempotency checks

### MISSING INVARIANTS
Check:
- Any endpoint accepting money/stock changes — is it inside `$transaction`?
- Any webhook handler — is HMAC verified BEFORE DB access?
- Any admin operation — does it have `RolesGuard`?

### UNTESTED PATHS
Scan for:
- Service methods with zero test coverage (grep for method name in spec files)
- Error paths (P2002, P2025, P2004) with no `catch` in service
- Queue processors with no test for the failure/retry path

### SCALING CONCERNS
Identify:
- Endpoints likely to be called > 100x/minute at launch (product list, search)
- DB queries without indexes on filter fields (cross-ref with /cortex-index results)
- Missing Redis caching on read-heavy, rarely-changing data

---

## RISK REPORT FORMAT

```
CORTEX RISK PREDICTION — {date} — scope: [scope]
═════════════════════════════════════════════════════════
HIGH RISK (likely to fail under load or concurrent use):
  [module]:[method] — [risk description] — [likelihood: HIGH/MED]

MEDIUM RISK (will fail in edge cases):
  [file]:[line] — [risk description]

LOW RISK (technical debt, not blocking):
  [file] — [description]
═════════════════════════════════════════════════════════
PRE-RELEASE CHECKLIST:
  ☐ Run /cortex-security
  ☐ Run /cortex-health
  ☐ Run /cortex-perf
  ☐ Verify all HIGH risks addressed
═════════════════════════════════════════════════════════
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-predict                 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risks      HIGH:[N] MED:[N] LOW:[N]
Logged     open-issues.json · LAYER_LOG
Next       [address HIGH risks before release | CLEAN — proceed]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
