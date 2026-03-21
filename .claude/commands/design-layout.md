```
╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /design-layout  |  v11.2  |  TIER: 6  |  BUDGET: LEAN       ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L2 · L6                                              ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Arrange sections into a full page layout          ║
║               ║ - Order sections by conversion logic                ║
║               ║ - Output complete page map for developer handoff    ║
║ CANNOT        ║ - Generate section content (use /design-section)    ║
║               ║ - Write production code or src/ files               ║
║               ║ - Override page flow without stated reason          ║
║ REQUIRES      ║ - MASTER-v11.3.md loaded                           ║
║               ║ - adapters/design/patterns.md loaded               ║
║ OUTPUTS       ║ - Page layout map · section order · flow rationale ║
╚═══════════════╩══════════════════════════════════════════════════════╝
```

Arrange multiple sections into a complete page layout using proven conversion flows.

$ARGUMENTS

Parse from $ARGUMENTS:
- `page` — page type: `landing` | `product` | `checkout` | `dashboard` | `settings` | `onboarding`
- `product` — one-line product/context description
- `sections` — comma-separated list of sections to include (optional — if omitted, use recommended defaults)

---

## STEP 1 — Load page type

Read: `adapters/design/patterns.md` — understand all available section types.
Read: `adapters/design/rules.md` — apply R1, R2, R5 especially.

If `page` is not recognized: list available page types and ask to clarify.

---

## STEP 2 — Determine section order

### Recommended flows by page type:

```
LANDING (marketing homepage)
─────────────────────────────────────────────
1. hero          ← first impression, value + primary CTA
2. features      ← what it does (after they care)
3. proof         ← why trust (before they commit)
4. pricing       ← decision (if applicable)
5. cta           ← final ask (same CTA as hero — consistency)

PRODUCT (individual product / feature page)
─────────────────────────────────────────────
1. hero          ← product-specific value statement
2. features      ← how this product specifically helps
3. proof         ← testimonials or usage stats for this product
4. cta           ← buy / try / contact

CHECKOUT (conversion page)
─────────────────────────────────────────────
1. form          ← primary task, minimum friction
   (no hero, no features — user already decided)

DASHBOARD (app interior)
─────────────────────────────────────────────
1. empty-state   ← shown when no data (first use)
2. [data sections as needed]

SETTINGS (app configuration)
─────────────────────────────────────────────
1. form(s)       ← grouped by topic
   (clear labels, save confirmation, no friction)

ONBOARDING (first-time user flow)
─────────────────────────────────────────────
1. hero          ← welcome + what to do first
2. empty-state   ← for each empty area (action-first)
3. cta           ← guide to first value moment
```

If `sections` provided: validate against recommended order — flag if order reduces conversion.

---

## STEP 3 — Output the page layout map

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE LAYOUT: [page type] — [product name or context]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FLOW LOGIC
─────────────────────────────────────────────
[1-2 sentences explaining the page strategy:
 what the user needs to feel at each section
 and why this order maximises conversion/action]

SECTION MAP
─────────────────────────────────────────────
Position 1  [section type]  → [what it must do for the user]
Position 2  [section type]  → [what it must do for the user]
Position 3  [section type]  → [what it must do for the user]
...

SECTION DETAILS
─────────────────────────────────────────────
For each section — purpose + primary constraint:

[1] [section type]
    Purpose : [why it is at this position]
    Goal    : [what user feeling/action it triggers]
    Gate    : [what must be true before moving to next section]
    Skill   : /design-section type=[type] product="[context]"

[2] [section type]
    ...

WHAT TO AVOID ON THIS PAGE
─────────────────────────────────────────────
- [Page-specific anti-pattern 1]
- [Page-specific anti-pattern 2]

MOBILE NOTE
─────────────────────────────────────────────
[One specific note about mobile priority for this page type]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4 — Rule check

Before outputting, verify against `adapters/design/rules.md`:
- [ ] R1: Would a new user know immediately what to do on this page?
- [ ] R2: Does each section have exactly one purpose?
- [ ] R5: Is there any unnecessary section that adds friction without adding value?

If any check fails: fix before outputting.

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /design-layout                  COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page       {page type} — {product context}
Sections   {N} sections in order
Rules      {N/3 passed | list any failures}
Next       /design-section to generate each section | /design-review to audit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
