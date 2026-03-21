╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /design-component  |  v1.0  |  TIER: 1  |  BUDGET: LEAN  ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ DOMAIN        ║ design                                               ║
║ AUTHORITY     ║ BUILDER                                              ║
║ CAN           ║ - Generate full component spec (all states + copy)  ║
║               ║ - Apply design-aesthetic.md visual rules            ║
║               ║ - Apply component-patterns.md accuracy laws         ║
║               ║ - Apply copy-patterns.md for all text               ║
║               ║ - Output handoff-ready spec                         ║
║ CANNOT        ║ - Write implementation code (→ dev domain)          ║
║               ║ - Choose stack or framework                          ║
║               ║ - Override 6 design rules                           ║
║ REQUIRES      ║ - adapters/design/component-patterns.md loaded      ║
║               ║ - adapters/design/design-aesthetic.md loaded        ║
║ PAIRED WITH   ║ /design-review (audit after) · /cortex-design-handoff║
╚═══════════════╩══════════════════════════════════════════════════════╝

/design-component v1.0 — Design a specific component with all states documented.

---

## INPUT PARSING

Parse from the user's message:
- `<component-type>` — what kind of component (see COMPONENT TYPES below)
- `<context>` — where it lives (product name, page, section)
- `<variant>` — optional specific variant or use case
- `--audit` — if provided, also run a design-review on the output

---

## STEP 1 — Load Design Context

Read adapters (in order):
1. `adapters/design/vocabulary.md` — shared language
2. `adapters/design/component-patterns.md` — 14 implementation accuracy laws
3. `adapters/design/design-aesthetic.md` — visual DNA
4. `adapters/design/copy-patterns.md` — copy accuracy laws

Check `knowledge/instincts.json` for any design-domain entries relevant to `<component-type>`.
If found → note the pattern. Do not re-invent a known solution.

---

## STEP 2 — Identify Component Type

Supported component types:

```
button          → primary · secondary · ghost · destructive · icon-only · loading
input           → text · email · password · number · search · textarea · select
checkbox        → single · group · indeterminate state
radio           → group · single selection
toggle          → on/off switch
card            → vertical · horizontal · feature · stat · testimonial · pricing
modal           → confirmation · form · content · alert
toast           → success · error · warning · info
navigation      → top bar · sidebar · bottom bar · breadcrumb · tabs
table           → data table · sortable · selectable
form            → single-column · multi-step · inline
empty-state     → first-use · no-results · error · offline
loading-state   → skeleton · spinner · progress
badge           → status · count · category
dropdown        → select · action menu · filter
```

If `<component-type>` is not in this list → output:
```
Component type "[type]" is not in the standard library.
Closest match: [suggest nearest type]
Proceed with [nearest type]? Or describe the component differently.
```

---

## STEP 3 — Generate Component Spec

For the identified component type, produce a full spec:

### 3A — Visual Structure

```
COMPONENT: [type] — [variant]
─────────────────────────────────────────
ANATOMY
  [List every element in the component, top-to-bottom, left-to-right]
  Example for button:
    - Container: [width] × [height] · radius: md (6px)
    - Icon: [size]px · [position: left | right]
    - Label: [typography token] · [color token]
    - Loading indicator: spinner [size]px (when loading state)
```

### 3B — All States

Document EVERY state. No state is optional.

```
STATES
─────────────────────────────────────────
default  → [visual description + tokens]
hover    → [delta from default]
active   → [delta from default — what changes on click/tap]
focus    → [focus ring: 2px solid [token], 2px offset]
disabled → [opacity or color delta + cursor: not-allowed]
loading  → [what replaces what — spinner position, label visibility]
error    → [only for inputs: border color + error text below]
```

Apply component-patterns.md law C1: every interactive component has all states designed.

### 3C — Copy Rules

```
COPY
─────────────────────────────────────────
Label       → [copy pattern reference + example for this context]
Placeholder → [example text, not a label — applies only to inputs]
Error msg   → [specific: what went wrong + what to do — W5]
Helper text → [below field, explains format or requirements]
Loading msg → [optional — specific to operation if > 300ms — W7]
```

Apply copy-patterns.md laws W3, W5, W6, W7 as appropriate.

### 3D — Accessibility Requirements

```
ACCESSIBILITY
─────────────────────────────────────────
Role        → [HTML semantic element or ARIA role]
Label       → [visible label or aria-label — never absent]
States      → [aria-disabled · aria-invalid · aria-expanded etc.]
Keyboard    → [what Tab/Enter/Escape/Arrow keys do]
Focus       → [focus trap if modal · returns to trigger on close]
```

Apply blueprint-design-accessibility.md: A3, A7, A11, A13 always. A8 for modals.

### 3E — Responsive Behavior

```
RESPONSIVE
─────────────────────────────────────────
Mobile xs   → [behavior at 375px]
Tablet md   → [behavior at 768px]
Desktop lg  → [unchanged | enhancement]
Touch       → [minimum 44×44px tap target confirmed — A7]
```

### 3F — Anti-Patterns (context-specific)

```
ANTI-PATTERNS — [component type]
─────────────────────────────────────────
❌ [3 specific things NOT to do with this component in this context]
   (sourced from component-patterns.md + rules.md)
```

---

## STEP 4 — Design Tokens Summary

List the specific tokens this component uses:

```
TOKENS USED
─────────────────────────────────────────
color.action.primary          → button background
color.text.inverse            → button label
color.action.primary (hover)  → hover state background
color.border.focus            → focus ring
typography.md                 → button label size (16px)
spacing.4 (16px)              → internal horizontal padding
spacing.2 (8px)               → internal vertical padding
radius.md (6px)               → border radius
```

If the project's token system is known (from CLAUDE.md or design-handoff.json): use actual token names.
If unknown: use the Cortex semantic token names above.

---

## STEP 5 — Handoff Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT SPEC — [type] — [variant]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
States:       [N] states documented
Copy laws:    [which W-laws applied]
A11y:         [key requirements listed]
Responsive:   Mobile · Tablet · Desktop defined
Tokens:       [N] tokens referenced
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /cortex-design-handoff
Or review: /design-review [paste component spec]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      design-component
STATUS:     COMPLETE
COMPONENT:  [type] · [variant]
STATES:     [N] documented
COPY:       [laws applied]
A11Y:       [WCAG AA ready | gaps noted]
NEXT:       /design-review | /design-copy | /cortex-design-handoff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
