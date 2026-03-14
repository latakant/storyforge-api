╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-design  |  v1.0  |  TIER: 2  |  BUDGET: MEDIUM   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L0 (Architecture) · L1 (Domain) · L2 (Planning)    ║
║ AUTHORITY     ║ DESIGNER                                            ║
║ CAN           ║ - Generate UX flows from feature intent            ║
║               ║ - Map features to the 12 Universal Screens         ║
║               ║ - Output component hierarchy + design tokens       ║
║               ║ - Define ALL states for every screen               ║
║               ║ - Identify which Product Engine a feature belongs  ║
║ CANNOT        ║ - Write production code (→ dev-frontend-*)         ║
║               ║ - Modify existing components                       ║
║               ║ - Skip state design for any screen (loading/empty/ ║
║               ║   error are NOT optional)                          ║
║ WHEN TO RUN   ║ - Before any new page or major UI feature          ║
║               ║ - When UX flow is unclear or disputed              ║
║               ║ - Before /dev-frontend-page or /dev-frontend-      ║
║               ║   component is invoked                             ║
║               ║ - When cortex-intent routes to Design Engine       ║
║ OUTPUTS       ║ - UX flow · Screen map · Component tree · Tokens   ║
║               ║ - Primary action per screen · State inventory      ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Design Engine — converts feature intent into UX intelligence.

Before any frontend code is written, reason about the user experience first.
This skill executes the full UX reasoning pipeline:
  intent → engine classification → screen mapping → UX flow → states → components → tokens

References:
- 7 Product Engines: Identity · Discovery · Decision · Transaction · Fulfillment · Engagement · Growth
- 12 Universal Screens: Auth · Home · Search · Category · Product · Cart · Checkout · OrderStatus · Profile · Notifications · History · Support
- Design principle: 1 screen = 1 primary action

$ARGUMENTS

Parse from $ARGUMENTS:
- `feature "<description>"` — free-text feature or screen intent
- `app-type <type>` — ecommerce | saas | marketplace | booking | tailoring | custom
- `actor <who>` — customer | admin | seller | tailor | driver (who uses this UI)
- `--component-only` — skip UX flow, output component map only
- `--flow-only` — output UX journey only, skip component/token design

---

## PHASE 1 — Intent Parsing

### 1.1 Read the feature intent
If `feature` arg → use as-is.
If no arg → stop: output "Provide feature: `/cortex-design feature \"order tracking page\"`"

### 1.2 Extract structured design model

```
DESIGN REQUEST
─────────────────────────────────────────────────────
Feature:       [what screen/feature is being designed]
Actor:         [who is using this: customer / admin / seller]
App Type:      [ecommerce / saas / marketplace / etc.]
Goal:          [what the user is trying to accomplish in 1 sentence]
─────────────────────────────────────────────────────
```

---

## PHASE 2 — Product Engine Classification

Classify this feature into one of the 7 Product Engines:

```
ENGINE CLASSIFICATION
─────────────────────────────────────────────────────
Identity Engine    — login, profile, auth, settings, permissions
Discovery Engine   — home feed, search, explore, categories, recommendations
Decision Engine    — product detail, reviews, comparisons, pricing, specs
Transaction Engine — cart, checkout, payment, coupon, order placement
Fulfillment Engine — order status, tracking, delivery, shipment, QC
Engagement Engine  — notifications, wishlist, saves, follows, activity
Growth Engine      — referrals, rewards, discounts, campaigns, sharing
─────────────────────────────────────────────────────
This feature belongs to: [ENGINE NAME]
Reason: [why]
```

---

## PHASE 3 — Screen Mapping

Map to the 12 Universal Screens. Mark which screens this feature touches:

```
SCREEN MAP
─────────────────────────────────────────────────────
Primary screen (feature lives here):
  [Screen name] — [why this is the primary screen]

Supporting screens (feature flows through):
  [Screen name] — [role in the flow]
  [Screen name] — [role in the flow]

Not needed:
  [Screens excluded and why]
─────────────────────────────────────────────────────
12 Screens reference:
  Auth · Home/Feed · Search/Explore · Category · Product/Detail ·
  Cart · Checkout/Payment · Order Status · Profile · Notifications ·
  History/Library · Support
```

---

## PHASE 4 — UX Flow

Define the step-by-step user journey for this feature:

```
UX FLOW — [Feature Name]
─────────────────────────────────────────────────────
Actor: [customer / admin / seller]

Step 1: [Actor] sees / arrives at [entry point]
  Entry trigger: [what brings user here — notification / nav tap / link]

Step 2: [Actor] does [action]
  UI element: [button / form / list / card]
  System response: [what happens]

Step 3: [Actor] sees [result]
  Success path: [what user sees when it works]
  Failure path: [what user sees when it fails]

...

Final step: [Actor] completes [goal]
  Exit: [where user goes next]
─────────────────────────────────────────────────────
Primary Action:  [THE one thing the user must do on this screen]
Secondary Actions: [list of optional supporting actions]
```

Design rule: Every screen must have exactly ONE primary action. Everything else is secondary.

---

## PHASE 5 — State Inventory

NEVER skip this. Every screen has states. Define all of them:

```
STATE INVENTORY — [Screen Name]
─────────────────────────────────────────────────────
Loading state:
  [What user sees while data is fetching]
  UI: skeleton / spinner / placeholder

Empty state:
  [What user sees when there is no data]
  Message: [human-friendly text]
  Action: [what user can do from here]

Error state:
  [What user sees when something fails]
  Message: [human-friendly text — no raw error codes]
  Action: retry / go back / contact support

Success / Default state:
  [What user sees with data loaded normally]

Edge states (list any that apply):
  Out of stock
  Expired
  Requires permission
  Payment failed
  Network offline
  [Any domain-specific states]
─────────────────────────────────────────────────────
```

---

## PHASE 6 — Component Hierarchy

Break the screen into a tree of components:

```
COMPONENT HIERARCHY — [Screen Name]
─────────────────────────────────────────────────────
Page (route level)
│
├── Layout wrapper ([AdminLayout | CustomerLayout | bare])
│
├── [SectionName]
│   ├── [ComponentA] — [what it displays / does]
│   ├── [ComponentB] — [what it displays / does]
│   └── [ComponentC] — [what it displays / does]
│
├── [SectionName]
│   ├── [ComponentD] — [what it displays / does]
│   └── [ComponentE] — [what it displays / does]
│
└── [ActionArea]
    └── [PrimaryActionButton] — [label + what it triggers]
─────────────────────────────────────────────────────
New components needed (does not exist yet):
  [ComponentA] — build with /dev-frontend-component
  [ComponentB] — build with /dev-frontend-component

Reuse existing components:
  [ExistingComponent] — already in codebase
─────────────────────────────────────────────────────
```

---

## PHASE 7 — Backend Entity Mapping

Connect UI to backend. What data does this screen consume?

```
BACKEND MAPPING — [Screen Name]
─────────────────────────────────────────────────────
API endpoints this screen calls:
  GET  /api/[resource]        — [what data: product list / order status / etc.]
  POST /api/[resource]        — [what action: place order / add to cart / etc.]

Prisma models this screen represents:
  [ModelName] → [which section of the UI shows this]
  [ModelName] → [which section of the UI shows this]

Real-time / polling needed?
  [Yes / No — if yes, what triggers refresh]

Auth required?
  [Level: PUBLIC | CUSTOMER | ADMIN | SELLER]
─────────────────────────────────────────────────────
```

---

## PHASE 8 — Design Tokens

Identify token needs for this screen (do not invent values — flag as TBD if not in design system):

```
DESIGN TOKENS — [Screen Name]
─────────────────────────────────────────────────────
Colors:
  Primary action:  [button color / CTA color]
  Status colors:   success=green · error=red · warning=amber · info=blue
  Background:      [card bg / page bg]
  Text:            [heading / body / muted]

Typography:
  Heading:         [font-size + weight]
  Body:            [font-size + weight]
  Caption:         [font-size + weight — used for metadata, timestamps]

Spacing:
  Page padding:    [tailwind: px-4 md:px-6 lg:px-8]
  Card padding:    [tailwind: p-4 or p-6]
  Gap between items: [tailwind: gap-3 or gap-4]

Layout:
  Screen type:     [full-width / centered / sidebar + content / grid]
  Responsive:      [mobile-first — list breakpoint changes]

Interactive feedback:
  Loading:         [skeleton / spinner]
  Hover:           [Tailwind hover: class]
  Disabled state:  [opacity / cursor change]
─────────────────────────────────────────────────────
```

---

## PHASE 9 — Execution Handoff

Output a ready-to-use handoff for the frontend developer (you or an agent):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN ENGINE HANDOFF — [Feature Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screen:          [primary screen name]
Actor:           [who uses this]
Engine:          [which Product Engine this belongs to]
Primary Action:  [the one CTA]

UX Flow:         [N steps — summarized]
States:          loading · empty · error · success [+ edge states]
New Components:  [N] to build
Reuse:           [N] existing

API calls:
  [list endpoints]

Build order:
  Step 1: /dev-frontend-component [ComponentA]
  Step 2: /dev-frontend-component [ComponentB]
  Step 3: /dev-frontend-page [route] [feature]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ Do NOT start coding before reviewing component hierarchy.
   Always build leaf components first, then compose into page.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## LEARNING — Log design decision

```bash
node scripts/lifecycle.js log --action=INSIGHT --module=design \
  --detail="DESIGN: [feature] · engine=[engine-name] · screens=[N] · components=[N] · states=[list]"
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-design                            COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature        [name]
Engine         [which Product Engine]
Screens        [N] primary · [N] supporting
States         [N] defined (loading + empty + error + success + N edge)
Components     [N] new · [N] reuse
API calls      [N] endpoints mapped
Logged         LAYER_LOG (TYPE: INSIGHT)
Next           /dev-frontend-component [first component] →
               /dev-frontend-page [route]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Quick Reference — What Each Phase Produces

| Phase | Input | Output |
|-------|-------|--------|
| 1 — Intent | Feature description | Structured design request |
| 2 — Engine | Design request | Product Engine classification |
| 3 — Screen Map | Engine | Which of 12 screens applies |
| 4 — UX Flow | Screen map | Step-by-step user journey + primary action |
| 5 — States | UX Flow | Loading · Empty · Error · Success · Edge states |
| 6 — Components | UX Flow + States | Component tree (new vs. reuse) |
| 7 — Backend | Component tree | API endpoints + Prisma models mapped |
| 8 — Tokens | Component tree | Tailwind token requirements |
| 9 — Handoff | All above | Execution plan for dev-frontend-* skills |

---

## Integration

| After /cortex-design | Run this |
|---------------------|----------|
| New components identified | `/dev-frontend-component [name]` — for each new component |
| Page structure clear | `/dev-frontend-page [app] [route] [feature]` |
| Service function missing | `/dev-frontend-service [endpoint]` first |
| Form identified | `/dev-frontend-form [feature]` |
| Table identified | `/dev-frontend-table [entity]` |
