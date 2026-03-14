Run System 1 diagnosis against the pattern library.

$ARGUMENTS

Parse from $ARGUMENTS: requestId (required) and optional date in YYYY-MM-DD format.

---

**STEP 1 — Show known patterns**
Run: `node scripts/diagnose.js --patterns`
Review the full pattern library before looking at the specific error — know what you are matching against.

---

**STEP 2 — Diagnose**
- If requestId provided: `node scripts/diagnose.js --id=<requestId>`
- If date also provided: `node scripts/diagnose.js --id=<requestId> --date=<date>`
- If no requestId but error description in $ARGUMENTS: run `node scripts/diagnose.js --summary` then manually match the error class against the pattern library

---

**STEP 3 — Interpret**

If **KNOWN pattern**:
- Report: pattern name, module, root cause, resolution steps
- Check `ai/fixes/applied/FIX_LOG.md` — was this area already fixed? If yes: this is a regression
- If regression: escalate — read the original fix and determine why it regressed

If **UNKNOWN pattern**:
- The diagnose.js output includes a formatted Claude prompt block — paste it directly into the session
- Run: `node scripts/learn.js analyze` to check if this matches any untracked pattern class
- Note the error type, module, and approximate frequency for Step 4

---

**STEP 4 — Feed the intelligence layer**
- Run: `node scripts/learn.js health` — is the affected module already trending degrading?
- If this is the 2nd+ occurrence of an UNKNOWN error class: flag it for promotion
  - Open `ai/learning/pattern-proposals.md` and add an entry if not already present
  - Next time: run `/cortex-learn` to promote it into `diagnose.js`

---

**STEP [LOG] — Record diagnosis outcome to System 2 (mandatory — this feeds the intelligence layer)**

Run: `node scripts/lifecycle.js log --action=INSIGHT --module=cortex --detail="DIAGNOSE: result=[KNOWN/UNKNOWN] pattern=[pattern-name or none] module=[affected-module] regression=[yes/no] requestId=[id]"`

Update `ai/learning/skill-usage.json`:
- Increment `invocations.cortex-diagnose.count` by 1
- Set `invocations.cortex-diagnose.last` to today's date
- If KNOWN: increment `invocations.cortex-diagnose.known` by 1 AND increment `diagnosis_coverage.known` by 1
- If UNKNOWN: increment `invocations.cortex-diagnose.unknown` by 1 AND increment `diagnosis_coverage.unknown` by 1
- Increment `diagnosis_coverage.total_diagnoses` by 1
- Recalculate `diagnosis_coverage.coverage_pct` = round(known / total_diagnoses * 100)
- Set `last_updated` to today's date

> Coverage % is the key intelligence metric. Target: 70%+.
> Below 50%: run `/cortex-learn` to promote unmatched patterns.

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-diagnose                COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result     KNOWN: {pattern name} | UNKNOWN
Regression {YES — re-investigate original fix | NO}
Coverage   {X}% (known/total diagnoses)
Logged     LAYER_LOG (TYPE: INSIGHT) · {date}
Next       /cortex-bug to fix | /cortex-learn if 2nd+ UNKNOWN occurrence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
