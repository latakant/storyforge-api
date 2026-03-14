# /cortex-lifecycle — System 2 Lifecycle Logger
# Log a codebase change event to the lifecycle tracker. Manual version of the auto-logging done by other skills.
# Use when: you made a change outside a skill, need to manually record an important event, or cross-referencing a runtime event.

$ARGUMENTS

Parse from $ARGUMENTS:
- **action** — one of the actions below
- **module** — the affected module name (see module list below)
- **detail** — human-readable description (be specific: file, behaviour, rule)

If any required field is missing from $ARGUMENTS, ask for it before proceeding. Do not guess.

---

## Action → Layer mapping

| Action | Layer | When to use |
|--------|-------|-------------|
| `FEATURE_ADDED` | L7_IMPL | New endpoint, new service method |
| `FEATURE_MODIFIED` | L7_IMPL | Changed existing behaviour |
| `FEATURE_REMOVED` | L7_IMPL | Deleted endpoint or feature |
| `BUG_FIXED` | L7_IMPL | Fixed a defect |
| `MIGRATION_RUN` | L8_RUNTIME | `prisma migrate dev` executed |
| `DEPLOYMENT` | L8_RUNTIME | Deployed to staging/production |
| `CONFIG_CHANGED` | L8_RUNTIME | env var added, changed |
| `DEPENDENCY_ADDED` | L8_RUNTIME | npm package added/upgraded |
| `SECURITY_PATCH` | L4_POLICY | Security-related fix |
| `PERFORMANCE_FIX` | L7_IMPL | Query, index, caching improvement |
| `PHASE_CHANGE` | L1_INTENT | Project phase milestone |
| `INSIGHT` | L9_FEEDBACK | Pattern discovered, learning cycle, analysis |

## Module names
`orders` · `payments` · `auth` · `cart` · `delivery` · `invoices` · `coupons` · `products`
`users` · `notifications` · `reviews` · `wishlist` · `search` · `tax` · `upload`
`settings` · `health` · `mailer` · `cortex` (for CORTEX-level events)

---

**STEP 1 — Log the event**
```bash
node scripts/lifecycle.js log --action=<action> --module=<module> --detail="<detail>"
```

If script not found or errors:
- Check: `ls scripts/lifecycle.js`
- If missing: log manually to `ai/lifecycle/LAYER_LOG.md` using the standard format from `ai/core/MASTER-v7.3.md`

---

**STEP 2 — Verify the log was written**
Run: `node scripts/lifecycle.js timeline --module=<module>`
Show the last 3 entries for that module — confirm the new entry appears correctly.

---

**STEP 3 — Cross-reference if this is bug-related**
If action is `BUG_FIXED` and a requestId is available from the original diagnosis:
Run: `node scripts/lifecycle.js cross --id=<requestId>`
This links the runtime event (System 1) to the code change (System 2) — the most powerful diagnostic tool.

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-lifecycle               COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event      {action} — {module}
Detail     {one-line summary}
Cross-ref  {linked requestId | N/A}
Logged     LAYER_LOG · {date}
Next       /cortex-commit if this event needs a commit record
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
