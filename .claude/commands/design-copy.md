╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /design-copy  |  v1.0  |  TIER: 1  |  BUDGET: LEAN       ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ DOMAIN        ║ design                                               ║
║ AUTHORITY     ║ BUILDER + REVIEWER                                   ║
║ CAN           ║ - Write copy for any section or component            ║
║               ║ - Audit existing copy against 10 accuracy laws      ║
║               ║ - Produce multiple headline/CTA variants             ║
║               ║ - Apply section-specific copy patterns               ║
║ CANNOT        ║ - Make brand or tone decisions without product info  ║
║               ║ - Approve copy without R6 check (no placeholder)    ║
║ REQUIRES      ║ - adapters/design/copy-patterns.md loaded            ║
║               ║ - adapters/design/vocabulary.md loaded               ║
║ PAIRED WITH   ║ /design-section · /design-component · /design-review ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/design-copy v1.0 — Write or audit copy for any UI section or component.

Two modes:
- **WRITE** — generate copy from a product/section description
- **AUDIT** — review existing copy against copy accuracy laws

---

## INPUT PARSING

Parse from the user's message:
- `<mode>` — WRITE or AUDIT (default: WRITE if copy is provided → AUDIT, otherwise WRITE)
- `<section-type>` — hero · features · proof · pricing · cta · empty-state · form · error · notification · modal · button
- `<product>` — what the product is and who it's for
- `<audience>` — who sees this copy
- `<existing-copy>` — for AUDIT mode, the current copy to review

---

## WRITE MODE

### STEP 1 — Load Copy Context

Read:
1. `adapters/design/copy-patterns.md` — 10 accuracy laws + section patterns
2. `adapters/design/vocabulary.md` — section definitions

Check `knowledge/instincts.json` for `"domain": "design"` copy-related entries.

### STEP 2 — Gather Missing Context (if needed)

If product or audience is not provided → ask ONE question only:
```
To write copy that converts, I need:
1. What does [product] do for the user? (one sentence, outcome-focused)
2. Who is the primary user? (role or profile)
```
Do not proceed with copy until outcome and audience are clear.

### STEP 3 — Generate Copy

For `<section-type>`, produce copy following the pattern in copy-patterns.md:

**Standard output format:**
```
COPY — [section-type] — [product]
─────────────────────────────────────────

Headline:
  Option A: [12 words max · outcome-focused · W1]
  Option B: [alternative angle]
  Option C: [alternative angle]

Subheadline:
  [1–2 lines · adds context · does not repeat headline · W2]

Primary CTA:
  Option A: [verb + outcome · W3]
  Option B: [alternative]

Support line (below CTA):
  [addresses #1 objection · W4]
  Objection assumed: [what you're addressing and why]
```

Produce 3 headline options. The user picks one.
Apply the relevant section copy pattern from copy-patterns.md.

**For error messages:**
```
ERROR COPY — [context]
─────────────────────────────────────────
Field: [what field or action]
Error: [what went wrong + what to do — W5]
Recovery CTA: [what to click next if applicable]
```

**For empty states:**
```
EMPTY STATE COPY — [context]
─────────────────────────────────────────
Heading: [what this area is for]
Body:    [why it's empty + what to do]
CTA:     [verb + outcome · W3]
```

**For notifications / toasts:**
```
NOTIFICATION COPY — [type: success | error | warning | info]
─────────────────────────────────────────
Message: [subject + what happened · W10]
Action:  [optional — dismiss or undo label]
```

### STEP 4 — Copy Confidence Check

For each piece of copy produced, check:
```
[ ] W1 — Headline ≤ 12 words, outcome-focused, no vague superlatives
[ ] W2 — Subheadline adds new info, does not repeat headline
[ ] W3 — CTAs use verb + outcome
[ ] W4 — Support line addresses a real objection
[ ] R6 — Zero placeholder copy in any output
```

If any check fails: revise before output.

---

## AUDIT MODE

When existing copy is provided:

### STEP 1 — Load Copy Laws

Read `adapters/design/copy-patterns.md` — all 10 accuracy laws.

### STEP 2 — Score Each Piece

```
COPY AUDIT — [section-type]
─────────────────────────────────────────

[Original copy]

LAW CHECKS:
W1 Headline (≤12w, outcome-focused): [PASS | FAIL — reason]
W2 Subheadline (adds context, no repeat): [PASS | FAIL — reason]
W3 CTA (verb + outcome): [PASS | FAIL — reason]
W4 Support line (objection answered): [PASS | FAIL — N/A]
W5 Errors (specific + action): [PASS | FAIL — N/A]
W6 Empty states (action-focused): [PASS | FAIL — N/A]
W10 Notifications (subject named): [PASS | FAIL — N/A]
R6 No placeholder copy: [PASS | FAIL]

ANTI-PATTERNS detected:
  [list any from copy-patterns.md anti-pattern list]

VERDICT:  PASS (all applicable laws pass) | WATCH (1-2 minor) | BLOCK (1+ critical failure)
```

### STEP 3 — Rewrite (if WATCH or BLOCK)

For each failing law: produce a corrected version.

```
REVISED COPY
─────────────────────────────────────────
Headline:      [revised — W1 compliant]
Subheadline:   [revised — W2 compliant]
CTA:           [revised — W3 compliant]
Support line:  [revised — W4 compliant]

Changes made:
  - [what changed and why]
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      design-copy
MODE:       [WRITE | AUDIT]
SECTION:    [type]
STATUS:     COMPLETE
LAWS:       [N] laws applied
VERDICT:    [PASS | WATCH | BLOCK] (audit mode)
NEXT:       /design-review | /design-section | /design-component
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
