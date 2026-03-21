```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /design-review  |  v11.2  |  TIER: 6  |  BUDGET: LEAN       ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L2 · L5 · L6                                         ║
║ AUTHORITY     ║ REVIEWER                                             ║
║ CAN           ║ - Audit any section or page layout against rules     ║
║               ║ - Score each of the 6 design rules 0–10             ║
║               ║ - Output specific, actionable fixes                 ║
║ CANNOT        ║ - Approve work that fails R1, R4, or R6             ║
║               ║ - Write production code                             ║
║               ║ - Override design rules without PA escalation       ║
║ REQUIRES      ║ - MASTER-v11.3.md loaded                           ║
║               ║ - adapters/design/rules.md loaded                  ║
║               ║ - adapters/design/patterns.md loaded               ║
║ OUTPUTS       ║ - Audit score · Rule verdicts · Specific fixes      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Audit a UI section or page layout against the 6 Cortex design rules.
Output a score, rule verdicts, and specific actionable fixes.

$ARGUMENTS

Parse from $ARGUMENTS:
- `target` — what to review: section content, page layout description, or paste of design spec
- `type` — (optional) section type if reviewing a specific section

---

## STEP 1 — Load design rules

Read: `adapters/design/rules.md` — load all 6 non-negotiable rules.
Read: `adapters/design/patterns.md` — load pattern for the section `type` if provided.

---

## STEP 2 — Audit against each rule

Score each rule 0–10:
- 10 = fully satisfied, no issues
- 7–9 = minor improvement possible
- 4–6 = clear gap, fix recommended
- 0–3 = rule violated — BLOCK (mark as FAIL)

```
RULE AUDIT RUBRIC
─────────────────────────────────────────────────────
R1  Clarity           Would a new user understand immediately?
                      Check: headline, labels, CTA, empty state messages
                      FAIL if: jargon, vague nouns, requires explanation

R2  One purpose       Does this section do exactly one thing?
                      Check: number of distinct goals in the section
                      FAIL if: two unrelated actions or messages compete

R3  Hierarchy         Does the most important element look most important?
                      Check: visual weight order matches importance order
                      FAIL if: secondary element is as prominent as primary

R4  CTA earns click   Does every CTA tell the user exactly what happens?
                      Check: all button/link labels
                      FAIL if: "Get Started", "Click Here", "Submit" with no context

R5  No friction       Is this the minimum needed to achieve the goal?
                      Check: required fields, steps, gates before value
                      FAIL if: unnecessary steps or fields before user goal

R6  No placeholder    Is all copy final and specific?
                      Check: all text, labels, button copy, descriptions
                      FAIL if: any "lorem ipsum", "[Your headline]", "Description here"
─────────────────────────────────────────────────────
```

---

## STEP 3 — Output the audit report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN AUDIT — [target name or section type]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERALL SCORE:  [N]/60   [PASS ≥ 42 / WATCH 30–41 / BLOCK < 30]
STATUS:         [PASS | WATCH | BLOCK]

RULE SCORES
─────────────────────────────────────────────
R1  Clarity        [N]/10   [PASS | WATCH | FAIL]
R2  One Purpose    [N]/10   [PASS | WATCH | FAIL]
R3  Hierarchy      [N]/10   [PASS | WATCH | FAIL]
R4  CTA            [N]/10   [PASS | WATCH | FAIL]
R5  No Friction    [N]/10   [PASS | WATCH | FAIL]
R6  No Placeholder [N]/10   [PASS | WATCH | FAIL]

FINDINGS
─────────────────────────────────────────────
[For each rule that scored < 10:]

R[N] — [rule name]  Score: [N]/10  [FAIL/WATCH]
Issue   : [specific thing that is wrong]
Example : [quote the exact copy or element]
Fix     : [specific, actionable instruction]

PATTERN CHECK (if section type known)
─────────────────────────────────────────────
Structure match: [matches pattern | missing: X, Y, Z]
Anti-patterns  : [none found | flagged: X]

WHAT IS WORKING
─────────────────────────────────────────────
[1–3 specific things that are done well — be precise]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4 — Determine verdict

```
SCORE ≥ 42   AND   no FAIL rules   → PASS
  → Output: "Ready for developer handoff."

SCORE 30–41  OR   1 FAIL rule      → WATCH
  → Output: "Revise flagged items before handoff."

SCORE < 30   OR   2+ FAIL rules    → BLOCK
  → Output: "Do not hand off — revise and re-run /design-review."
```

If BLOCK: do not suggest workarounds. List fixes required and stop.

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /design-review                  COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target     {target name or section type}
Score      {N}/60  ({N} rules passed · {N} WATCH · {N} FAIL)
Verdict    {PASS | WATCH | BLOCK}
Next       {if PASS → /design-layout or dev-frontend-component}
           {if WATCH → fix flagged items then re-run /design-review}
           {if BLOCK → fix all FAIL rules then re-run /design-review}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
