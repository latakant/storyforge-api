```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-pattern  |  v8.0  |  TIER: 9  |  BUDGET: LEAN       ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L9                                                   ║
║ AUTHORITY     ║ ANALYST                                              ║
║ CAN           ║ - Read ai/learning/pending-patterns.json            ║
║               ║ - Read ai/learning/skill-usage.json                 ║
║               ║ - Read ai/memory/ pattern files                     ║
║               ║ - Write ai/lifecycle/LAYER_LOG.md (PATTERN_QUERY)   ║
║ CANNOT        ║ - Modify src/ files                                 ║
║               ║ - Promote patterns (use /cortex-learn)              ║
║ REQUIRES      ║ - MASTER-v8.0.md loaded                            ║
║ OUTPUTS       ║ - Pattern query result                              ║
║               ║ - Completion block: COMPLETE                        ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Query the pattern library — find known solutions to recurring problems. Read-only. Use before solving.

$ARGUMENTS

Parse: `query` (required) — keyword or problem description · `type` — `bug` | `solution` | `anti-pattern` | blank = all

---

## HOW TO USE

Before writing a solution to a recurring problem, check if it's already been solved:

```
/cortex-pattern "N+1 query in paginated list"
/cortex-pattern "OTP brute force prevention"
/cortex-pattern "webhook idempotency"
```

---

## SEARCH PROCEDURE

1. Read `ai/learning/pending-patterns.json` — search for keyword in title/tags
2. Read `ai/memory/DOMAIN_MEMORY.md` — check known patterns section
3. Read relevant domain skill (ecom-payments, ecom-orders, etc.) — check anti-patterns

---

## OUTPUT FORMAT

```
PATTERN QUERY: "[query]"
─────────────────────────────────────────────────────────────────
FOUND [N] matching patterns:

Pattern 1: [title]
  Type:       [bug fix | design pattern | anti-pattern]
  Problem:    [what it solves]
  Solution:   [the recommended approach]
  Source:     [file:line or skill that documents it]
  Confidence: [confirmed (2+ projects) | pending (1 project)]

Pattern 2: ...
─────────────────────────────────────────────────────────────────
NO MATCH? → Use /cortex-bug to capture a new pattern after you solve it.
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-pattern                 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Query      "[query]"
Found      [N] patterns | [N] confirmed | [N] pending
Next       [apply pattern | /cortex-bug to capture new one | /cortex-learn to promote]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
