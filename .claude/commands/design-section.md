```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /design-section  |  v11.2  |  TIER: 6  |  BUDGET: LEAN      ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L2 · L6                                              ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Generate UI section structure + content           ║
║               ║ - Match against adapters/design/patterns.md         ║
║               ║ - Output layout, copy, component structure          ║
║ CANNOT        ║ - Write production code (use design-layout for page)║
║               ║ - Modify src/ files directly                        ║
║               ║ - Override design rules without stated reason       ║
║ REQUIRES      ║ - MASTER-v11.3.md loaded                           ║
║               ║ - adapters/design/patterns.md loaded               ║
║ OUTPUTS       ║ - Section structure · copy · component list        ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Generate a UI section using proven design patterns from the design adapter.

$ARGUMENTS

Parse from $ARGUMENTS:
- `type` — section type: `hero` | `features` | `proof` | `pricing` | `cta` | `empty-state` | `form`
- `product` — one-line product/context description
- `audience` — who this is for (optional)

---

## STEP 1 — Load design context

Read: `adapters/design/patterns.md` — find the pattern matching `type`.
Read: `adapters/design/rules.md` — apply all 6 non-negotiable rules.

If type is not recognized: list available types and ask the user to clarify.

---

## STEP 2 — Match pattern

From `patterns.md`, extract for the matched section type:
- Structure (required components)
- Rules (constraints)
- Anti-patterns (what to avoid)

If product/audience provided: tailor copy to that context.
If not provided: generate with clear placeholders that describe WHAT goes there.

---

## STEP 3 — Generate section

Output the section in this exact format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION: [type] — [product name or context]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRUCTURE
─────────────────────────────────────────────
[Component 1]: [value or copy]
[Component 2]: [value or copy]
[Component 3]: [value or copy]
...

COPY
─────────────────────────────────────────────
Headline:    [exact text]
Subheadline: [exact text]
CTA label:   [exact text]
[other copy fields relevant to section type]

COMPONENT LIST (for developer handoff)
─────────────────────────────────────────────
- [ComponentName] — [description]
- [ComponentName] — [description]

DESIGN NOTES
─────────────────────────────────────────────
Why this structure works: [1–2 sentences]
Watch out for: [1 anti-pattern to avoid]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4 — Rule check

Before outputting, verify against `adapters/design/rules.md`:
- [ ] R1: Is this clear? Would a new user understand immediately?
- [ ] R2: Does this section have exactly one purpose?
- [ ] R4: Does the CTA label tell the user what they get?
- [ ] R6: No placeholder copy in final output?

If any check fails: fix before outputting.

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /design-section                 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Section    {type} — {product context}
Pattern    {pattern name from patterns.md}
Rules      {N/6 passed | list any failures}
Next       /design-layout to arrange full page | /design-review to audit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
