Run enterprise governance scoring and produce a domain-level report.

---

## FALSE-POSITIVE WHITELIST

Before reporting violations, filter out known false positives that are permanently
accepted for this project. These will NEVER surface as actionable violations.

Check for a whitelist file:
```bash
cat ai/state/checker-whitelist.json 2>/dev/null
```

Format of `ai/state/checker-whitelist.json`:
```json
{
  "whitelist": [
    {
      "id": "SEC-05",
      "reason": "Rate limiting handled at nginx/gateway layer — not in app code",
      "accepted_by": "architect",
      "date": "2026-03-17"
    },
    {
      "id": "ERR-02",
      "reason": "Global exception filter covers all unhandled errors — per-module try/catch not required",
      "accepted_by": "architect",
      "date": "2026-03-17"
    },
    {
      "id": "QUAL-02",
      "reason": "TODO comments in ai/ directory are governance notes, not production code",
      "accepted_by": "architect",
      "date": "2026-03-17"
    }
  ]
}
```

If the whitelist file exists:
- Filter checker output to remove any violation whose `id` matches a whitelist entry
- When displaying violations, add a note: `[N whitelisted — see ai/state/checker-whitelist.json]`
- Whitelisted items NEVER affect the score and NEVER appear as actionable violations

To ADD a new whitelist entry: run `/cert-score whitelist <rule-id> "<reason>"`
To REMOVE an entry: manually edit `ai/state/checker-whitelist.json` and delete the entry.

---

**STEP 1 — Fresh checker run**
Run: `node scripts/enterprise-checker.js --check`

---

**STEP 2 — Compare to stored baseline**
Read: `ai/state/current-score.json`
Calculate delta per domain: new score vs stored score.

---

**STEP 3 — Module health**
Run: `node scripts/learn.js health`
Note: which modules are improving / stable / degrading.

---

**STEP 4 — Update state if score changed**
If overall score differs from `current-score.json`:
- Update `ai/state/current-score.json` with new values and today's date
- Update the score line in `ai/STATUS.md`
- If delivery decision changed (ALLOW ↔ BLOCK): update STATUS.md delivery decision and open blockers section

---

Output this exact format:

```
ENTERPRISE SCORE — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain           Score    Delta    Violations
Financial        XX/100   [+X/-X]  [count]
Security         XX/100   [+X/-X]  [count]
Concurrency      XX/100   [+X/-X]  [count]
Queue            XX/100   [+X/-X]  [count]
Error Handling   XX/100   [+X/-X]  [count]
Type Safety      XX/100   [+X/-X]  [count]
DB Health        XX/100   [+X/-X]  [count]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:           XX/100   [+X/-X]  Decision: [ALLOW/BLOCK]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Module Health:   [heatmap line from learn.js health]
New violations:  [list any not in current-score.json, or None]
State updated:   [Yes/No]
```

**STEP [LOG] — Record score check to System 2 (always log, even if score unchanged)**

Run: `node scripts/lifecycle.js log --action=INSIGHT --module=cortex --detail="SCORE_CHECK: score=[X/100] delta=[+X or -X or 0] decision=[ALLOW/BLOCK] new_violations=[count or none] state_updated=[yes/no]"`

Update `ai/learning/skill-usage.json`:
- Increment `invocations.cortex-score.count` by 1
- Set `invocations.cortex-score.last` to today's date
- Set `invocations.cortex-score.last_score` to the new score value
- Set `last_updated` to today's date

---

## Completion block (MASTER-v11.3.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-score                   COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score      {before} → {after}/100  |  Decision: {ALLOW/BLOCK}
Domains    {n improved · n unchanged · n degraded}
State      {updated | unchanged}
Logged     LAYER_LOG (TYPE: INSIGHT) · {date}
Next       /cortex-analyse to prioritise fixes | /cortex-session to continue
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
