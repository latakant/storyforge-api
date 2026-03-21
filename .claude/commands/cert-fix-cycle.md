╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cert-fix-cycle  |  v1.0  |  TIER: 1  |  BUDGET: LEAN     ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L7 (Impl) + L9 (Feedback)                           ║
║ AUTHORITY     ║ EXECUTOR + ANALYST                                   ║
║ PIPELINE      ║ cert-bug → pattern-close  (sequential, atomic)      ║
║ CAN           ║ - Run full cert-bug diagnosis + fix                  ║
║               ║ - Close the learning loop on the pattern captured    ║
║               ║ - Graduate pattern immediately if threshold met      ║
║               ║ - Share graduated pattern to orchestrator            ║
║ CANNOT        ║ - Skip cert-bug (the fix must happen first)         ║
║               ║ - Run the full cert-learn cycle (that's separate)   ║
║               ║ - Modify instincts.json directly                    ║
║ WHEN TO RUN   ║ - Any time you use /fix — replaces standalone /fix  ║
║               ║ - Use /fix for quick single-line fixes               ║
║               ║   Use /cert-fix-cycle when learning matters         ║
║ REPLACES      ║ /fix → cert-bug  (adds learning close step)         ║
║ STACKS WITH   ║ /cert-learn — for full deliberate pattern review    ║
║               ║ /cert-precheck — run before for guardrail context   ║
║ OUTPUTS       ║ - Fixed code (from cert-bug)                        ║
║               ║ - Pattern captured / graduated / pending            ║
║               ║ - Learning loop status                              ║
╚═══════════════╩══════════════════════════════════════════════════════╝

**The complete fix + learn cycle — one command.**
cert-bug fixes the bug. Pattern-close closes the learning loop on what was fixed.

The gap this fills:
  cert-bug (step 8.5) always writes the fix to pending-patterns.json as "promoted: false"
  cert-learn (full 10-step cycle) is meant to review and promote all pending patterns
  BUT cert-learn is never triggered automatically — patterns accumulate unreviewed,
  the pattern library grows stale, and future bugs take 30 minutes that should take 30 seconds.

cert-fix-cycle closes the loop on THIS fix, immediately.
cert-learn is still for deliberate full-cycle review (run weekly or at session end).

$ARGUMENTS — same as cert-bug: error description, module name, or symptom (required)

---

## STAGE 1 — cert-bug (full flow, unchanged)

Run the complete cert-bug protocol for $ARGUMENTS:

1. Load context (invariants.md, forbidden.md, FIX_LOG.md — regression check)
2. Diagnose via `node scripts/diagnose.js` — KNOWN (30s fix) or UNKNOWN
3. Identify root cause — 8-question enterprise framework
4. Risk check → output block, STOP if "NEEDS REVIEW"
5. Apply minimal fix only
6. Verify — `npx tsc --noEmit` must pass
7. Log to FIX_LOG.md + TRACKER.md
8. Lifecycle log (BUG_FIXED)
9. **Step 8.5** — Auto-capture pattern to pending-patterns.json (ALWAYS runs)
10. **Step 8.6** — Verify fix signals + extract watchpoints

Do not skip any step. cert-bug runs complete and unmodified.
Pattern is now in pending-patterns.json with `"promoted": false`.

---

## STAGE 2 — Pattern Close (lightweight learn loop)

This runs immediately after cert-bug completes. It closes the loop on the single pattern
just captured — without running the full cert-learn 10-step cycle.

### Step 2.1 — Read what was captured

```bash
# Read the most recently added entry in pending-patterns.json
cat ai/learning/pending-patterns.json 2>/dev/null
```

Find the entry just written by cert-bug (most recent `captured` timestamp).
Note: `root_cause_category`, `module`, `fix_pattern`, `verification.status`.

If verification.status is FAIL → do not proceed to graduation.
Output: `⚠️ Fix verification FAIL — pattern captured but flagged unreliable. Manual review needed.`

---

### Step 2.2 — Check for prior matches

Count existing entries in pending-patterns.json that match ALL of:
- Same `root_cause_category`
- Same `module` (or same domain if module differs)

Also check `ai/learning/instincts.json` for any instinct with the same trigger pattern.
Also check `scripts/diagnose.js` for any existing KNOWN pattern matching this root cause.

```
MATCH RESULT:
  Already KNOWN (in diagnose.js)  → pattern already graduated, no action needed
  Instinct exists (instincts.json) → check confidence level, may need increment
  N prior matches in pending      → determines action below
  0 prior matches                 → first observation, capture only
```

---

### Step 2.3 — Decide and act

**Case A — Pattern already KNOWN (exists in diagnose.js):**
```
✅ KNOWN PATTERN — no new action needed
   This pattern is already in the diagnosis library.
   Next occurrence: 30-second resolution via diagnose.js.
```

**Case B — Pattern already in instincts.json:**
Read the existing instinct entry. Increment `confidence` by +0.1. Increment `evidence_count` by 1.
Update `last_triggered` to today.

```bash
# Show proposed instinct update
cat ai/learning/instincts.json | grep -A 10 "[matching instinct id]"
```

Output:
```
📈 INSTINCT UPDATED — [instinct-id]
   Confidence: [old] → [new]
   Evidence:   [old] → [new]
   [If confidence ≥ 0.8 AND evidence ≥ 3 → GRADUATION ELIGIBLE — see Case D]
```

**Case C — 1-2 prior matches (building confidence):**
```
🔵 PATTERN PENDING — [N+1] observations now recorded
   root_cause: [category]
   module:     [module]
   Threshold:  [N+1] / 3 observations · confidence [current] / 0.8 needed
   Status:     [N] more observations before graduation to diagnose.js
```

Add a new instinct entry to `ai/learning/instincts.json` if none exists:
```json
{
  "id": "[module]-[root_cause_category]-[YYYY-MM]",
  "trigger": "when [symptom description]",
  "action": "[fix_pattern from cert-bug capture]",
  "confidence": 0.4,
  "evidence_count": [N+1],
  "last_triggered": "[today ISO]",
  "graduated": false
}
```

**Case D — 3+ matches AND confidence ≥ 0.8 — GRADUATION:**

This pattern has proven itself. Graduate it immediately.

```bash
node scripts/learn.js promote [pattern-id] 2>/dev/null
```

If `learn.js` not available:
- Update the instinct entry: set `"graduated": true`
- Note for manual promotion: `add to scripts/diagnose.js as KNOWN pattern`

Then attempt to share to orchestrator:
```bash
curl -s -X POST http://localhost:7391/patterns \
  -H "Content-Type: application/json" \
  -d '{"id":"[id]","project":"[package.json name]","description":"[fix_pattern]","module":"[module]","errorClass":"[root_cause_category]","fixApproach":"[fix_pattern]","occurrences":[N],"confidence":[confidence],"tags":["[framework]","[domain]"]}' \
  --max-time 2 2>/dev/null
```

Output:
```
🎓 PATTERN GRADUATED — [instinct-id]
   root_cause:  [category]
   module:      [module]
   fix_pattern: [what works]
   Evidence:    [N] observations · confidence [X]
   Status:      Now in diagnose.js — future occurrences resolve in ~30 seconds
   Shared:      [✅ orchestrator | ⚠️ offline — local only]
```

---

### Step 2.4 — Pending backlog check

```bash
cat ai/learning/pending-patterns.json 2>/dev/null | grep -c '"promoted": false'
```

Output:
- 0–2 pending: `✅ Pattern library current.`
- 3–4 pending: `📋 [N] patterns pending review. Run /cert-learn at session end.`
- 5+ pending: `⚠️ [N] patterns backlogged — pattern library growing stale. Run /cert-learn now.`

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:       cert-fix-cycle v1.0
STATUS:      COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIX:         [module] — [what was fixed] — [PASS/FAIL]
PATTERN:     [KNOWN already | UPDATED confidence [X] | GRADUATED 🎓 | PENDING [N/3]]
BACKLOG:     [N] patterns pending — [run cert-learn | library current]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT (if fix passed):  /ship  →  verify + commit
NEXT (if graduated):   /cert-learn  →  full cycle confirms graduation
NEXT (if backlogged):  /cert-learn  →  clear the pending queue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## WHEN TO USE cert-fix-cycle vs /fix

```
/fix                → quick fix, learning not needed (small config change, typo)
/cert-fix-cycle     → any real bug — learn from it, close the loop immediately
/fix + /cert-learn  → deliberate full pattern review at session end
```

The rule: if the bug took more than 5 minutes to diagnose, use cert-fix-cycle.
Patterns earned through real debugging are the most valuable thing Cortex learns.

---

## INSTALL

```bash
# Tier 1 — install to all Cortex projects
cp C:\luv\Cortex\skills\cert-fix-cycle.md [project]\.claude\commands\cert-fix-cycle.md
```
