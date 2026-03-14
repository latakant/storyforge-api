Intelligent debugger — resolves issues using a 3-tier knowledge system, learns from every new fix.

$ARGUMENTS

---

## PHASE 0 — INTELLIGENCE LOADING (always first, never skip)

**Load Tier 1 — Pattern library (13 known patterns):**
Run: `node scripts/diagnose.js --patterns`
Hold ALL 13 patterns in memory: their IDs, what they match (error code, URL, event type), and their fix.

**Load Tier 2 — Debugger knowledge base (self-built, grows with every fix):**
Read: `ai/learning/debugger-knowledge.md`
This is the debugger's own memory — fixes applied before that aren't yet in Tier 1.
For each entry, hold: ID, symptom signature, root cause, fix pattern, occurrence count.

**Load context:**
- Read: `ai/learning/module-health.json` — which modules are degrading right now?
- Read: `ai/fixes/applied/FIX_LOG.md` (last 15 lines) — what was touched recently?
- Read: `ai/state/open-issues.json` — any known open issues matching the description?

---

## PHASE 1 — PRIME SUSPECT (opinionated hypothesis before investigating)

Before running any scripts, output a hypothesis based on what you loaded:

```
PRIME SUSPECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Most likely: [error class — e.g., "P2002 not caught in <module>"]
Because:     [module trending 🔴 / recent fix in this area / matches Tier 2 entry]
Confidence:  [High (Tier 1 match) / Medium (Tier 2 match) / Low (new)]
Verify by:   [what to check first — e.g., "run diagnose.js" or "read service try/catch"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then verify the hypothesis.

---

## PHASE 2 — TIER 1: Pattern library match (target: 30 seconds)

If $ARGUMENTS contains a requestId:
- Run: `node scripts/diagnose.js --id=<requestId>`

If error description provided (no requestId):
- Run: `node scripts/diagnose.js --summary` to see recent pattern activity
- Manually match the error class against the 13 known patterns

**If KNOWN pattern matched:**
```
TIER 1 RESOLVED ✅
Pattern:     [pattern ID]
Root cause:  [from pattern description]
Fix:         [from pattern action]
Status:      [already fixed in codebase / needs fix applied]
```
Apply fix if needed. Run `npx tsc --noEmit`. Jump to PHASE 5 (Close).

**If no Tier 1 match → continue to Tier 2.**

---

## PHASE 3 — TIER 2: Debugger knowledge base match (target: 2-5 minutes)

Compare the error against every entry in `ai/learning/debugger-knowledge.md`.

Match criteria (check all):
- Same HTTP status code or Prisma error code?
- Same symptom description class? (e.g., "unique constraint", "null reference", "guard order")
- Same module type? (auth-adjacent, financial, queue-related)
- Same event type from diagnose output? (`unhandled_error`, `financial_mutation`, etc.)

**If MATCH found in knowledge base:**
```
TIER 2 RESOLVED 🧠
Entry:       [DEBUGGER-ENTRY-ID]
First seen:  [date]
Occurrences: [N] (this will be N+1)
Root cause:  [from entry]
Fix:         [from entry fix pattern]
```
Apply the documented fix. Run `npx tsc --noEmit`.
Update the entry in `debugger-knowledge.md`: increment `Occurrences` by 1.

**Promotion check:** If occurrences is now >= 2 AND not yet promoted to Tier 1:
- Proceed to PHASE 4-L (Learning Loop — Promotion) after closing the fix.

**If no Tier 2 match → continue to Tier 3.**

---

## PHASE 4 — TIER 3: Full investigation (new issue — unknown territory)

### 4a. Triage the subsystem

| Symptom | Subsystem | Primary file to read |
|---------|----------|---------------------|
| HTTP 500 | Unhandled exception | `<module>.service.ts` — missing try/catch |
| HTTP 401 | JWT / token invalid | `auth/guards/jwt-auth.guard.ts` |
| HTTP 403 | Wrong role / guard order | Controller decorators + `RolesGuard` |
| HTTP 400 | DTO validation failed | DTO file + class-validator decorators |
| HTTP 409 | P2002 not caught | Service try/catch block |
| HTTP 404 | P2025 not caught / route missing | Service null check + module routes |
| Queue job failing | Processor not re-throwing | `.processor.ts` + `@OnWorkerEvent('failed')` |
| NestJS DI error | Missing provider / circular dep | `<module>.module.ts` providers/imports |
| Frontend blank page | Uncaught render error | Component null checks + `isLoading` guard |
| React Query stale | Wrong queryKey or missing invalidation | `useQuery` key + `invalidateQueries` |
| Token refresh loop | Interceptor deadlock | `lib/api-client.ts` interceptor queue |

### 4b. Apply the 8-question enterprise check

Before writing any fix, answer all 8:
1. **Money** — Is the rupee mutation inside `$transaction`? Is there a DB CHECK constraint?
2. **Race conditions** — Could concurrent requests cause this? Is there a unique constraint as last guard?
3. **Queue** — Does the processor re-throw? Is there a DLQ? Are side-effects queued not inlined?
4. **Error mapping** — P2002→409? P2025→404? No raw 500s for expected failures?
5. **Security** — Secrets timing-safe? Rate-limited? Never hardcoded?
6. **Observability** — Is the failure logged with requestId and context?
7. **Types** — Is `any` used? Can a wrong type reach the DB silently?
8. **DB health** — Index on every FK and high-traffic field?

### 4c. Read the relevant source files and apply minimal fix

Minimal change only — no refactoring while debugging.
Run: `npx tsc --noEmit` — 0 errors.
Run: `npx jest --testPathPattern=<module> --passWithNoTests` — tests pass.

---

## PHASE 4-L — LEARNING LOOP (mandatory after every Tier 3 fix)

This is what makes the debugger smarter. Every new fix becomes Tier 2 knowledge.

### L1 — Characterize the error class

Name it: what general pattern does this belong to?
Examples: `P2002-ORDERS-ITEM`, `GUARD-ORDER-WRONG`, `NULL-CHECK-MISSING-SERVICE`, `QUEUE-PROCESSOR-NO-RETHROW`

### L2 — Write the knowledge base entry

Append to `ai/learning/debugger-knowledge.md`:

```markdown
## [DEBUGGER-ENTRY-ID] — [DESCRIPTIVE_NAME]
**First seen:** [YYYY-MM-DD]
**Occurrences:** 1
**Module(s):** [module name]
**Symptom:** [what showed in logs/error message/UI — specific enough to match next time]
**Root cause:** [one clear sentence]
**Fix pattern:** [the code change — generic enough to reuse, not hyper-specific]
**Test added:** [yes — test name / no]
**Promoted to Tier 1:** no
**Pattern ID:** —

### match() predicate
```js
match: (events) => events.some(e =>
  [WRITE THE REAL PREDICATE HERE — not TODO]
  // Use the event schema:
  // e.type: 'http_request' | 'unhandled_error' | 'financial_mutation' | 'queue_lifecycle' | 'webhook_received' | 'security_event' | 'cron_lifecycle'
  // e.prismaCode: 'P2002' | 'P2025' | 'P2003' etc.
  // e.url: the request path
  // e.module: the NestJS module name
  // e.message: error message string
  // e.statusCode: HTTP status
),
```
```

> The match() predicate is the most important part. Write it correctly now so promotion is immediate.
> Look at how existing Tier 1 patterns match: `e.prismaCode === 'P2002' && e.url?.includes('/orders')`

### L3 — Check for Tier 1 promotion

Run: `node scripts/learn.js analyze`

If this error class has occurred 2+ times across all history:
```
PROMOTION CANDIDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Entry:       [DEBUGGER-ENTRY-ID]
Occurrences: [N]
match():     [show the predicate]
Promote?     This will add the pattern to diagnose.js Tier 1.
             Future occurrences resolved in 30 seconds.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If user confirms: Run `node scripts/learn.js promote <id>`
Then update the entry in `debugger-knowledge.md`: set `Promoted to Tier 1: yes` + `Pattern ID: [id]`

### L4 — Update module health

Run: `node scripts/learn.js health`
Note if the affected module's trend changed after this fix.

---

## PHASE 5 — CLOSE (governance — runs after any tier resolution)

**Use `/cortex-bug`** with the bug description.
This handles: FIX_LOG.md entry, TRACKER.md, lifecycle log (BUG_FIXED), skill-usage.json.

**Update diagnosis coverage:**
Update `ai/learning/skill-usage.json`:
- If Tier 1 or Tier 2 resolved → increment `diagnosis_coverage.known`
- If Tier 3 → increment `diagnosis_coverage.unknown`
- Recalculate `coverage_pct`

---

## Debugger Intelligence Progression

```
Session 1:   Tier 1: 13 patterns  |  Tier 2: 0 entries  |  Coverage: ?%
After 5 bugs: Tier 1: 13          |  Tier 2: 3-5 entries |  Coverage grows
After 10 bugs:Tier 1: 14-16       |  Tier 2: 5-8 entries |  Coverage: 70%+
              (2+ occurrence entries promoted to Tier 1)
```

Every Tier 3 fix: +1 Tier 2 entry
Every 2nd occurrence: potential Tier 1 promotion (permanent 30-second resolution)

---

Output:
- Tier resolved (1/2/3) | confidence level | pattern matched or new entry ID
- Prime suspect: correct/incorrect
- Knowledge base: updated entry (Tier 3 only)
- Promotion: yes/no/pending
- Module health: trend after fix
