Run a full enterprise governance audit. This is an ARCH-path operation — read-heavy, comprehensive.

---

**STEP 1 — Baseline**
Read: `ai/governance/ENTERPRISE_ECOM_GOVERNANCE_REPORT.md` (baseline: 79/100, 2026-02-21)
Read: `ai/state/current-score.json` (stored current state)
Read: `ai/state/open-issues.json` (what is still open)

---

**STEP 2 — Fresh analysis**
Read: `ai/BOOTSTRAP.md` — use this as the full audit lens
Run: `node scripts/enterprise-checker.js --check`
Run: `node scripts/learn.js maturity`
Run: `node scripts/lifecycle.js timeline`

---

**STEP 3 — CORTEX health check**
Verify all pipelines are active:
- System 1: Does `logs/YYYY-MM-DD.log` exist for today? Does it have entries?
- System 2: Does `logs/lifecycle/YYYY-MM-DD.jsonl` exist for today?
- Diagnoses: Does `logs/diagnoses/` have files from the last 7 days?
- Learning: Is `ai/learning/pattern-proposals.md` recent? Any unreviewed proposals?
- Hooks: Are git hooks installed? Check `.git/hooks/` for pre-commit, post-commit, pre-push.

---

**STEP 4 — Produce audit summary**

```
GOVERNANCE AUDIT — [today's date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score journey:  79 (baseline) → 96 (stored) → [X] (today)
Decision:       [ALLOW/BLOCK]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain changes vs stored:
  [domain] — [improved/regressed/unchanged] — [why]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issues not moved since last audit:
  [list any open issues unchanged for 7+ days]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX health:  [all pipelines active / gaps noted]
Pattern library: [X patterns active, Y stale]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Batch 3 open:   [list remaining items with priority]
Recommended:    [top 1-2 actions]
```

---

**STEP 5 — Update state**
Update `ai/STATUS.md` if score or decision changed.
Do NOT overwrite `ai/governance/` files — append a new dated section only.
Append to `ai/TRACKER.md`.

---

**STEP [LOG] — Record audit completion to System 2**

Run: `node scripts/lifecycle.js log --action=INSIGHT --module=cortex --detail="AUDIT_COMPLETE: score=[X/100] delta_from_stored=[+X or -X or 0] cortex_health=[all_active/gaps_noted] open_issues=[count] patterns=[X active/Y stale]"`

Update `ai/learning/skill-usage.json`:
- Increment `invocations.cortex-audit.count` by 1
- Set `invocations.cortex-audit.last` to today's date
- Set `last_updated` to today's date

---

## Completion block (MASTER-v11.3.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-audit                   COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score      {baseline} → {stored} → {today}/100  |  {ALLOW/BLOCK}
Pipelines  {all active | gaps: list}
State      {updated | unchanged}
Logged     LAYER_LOG (TYPE: INSIGHT) · {date}
Next       {top recommended action from audit}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
