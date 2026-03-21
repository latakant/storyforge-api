╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-design-handoff  |  v1.0  |  TIER: 1              ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L2 (Domain) + L3 (Contract)                         ║
║ AUTHORITY     ║ ARCHITECT                                            ║
║ CAN           ║ - Read all completed design work                     ║
║               ║ - Surface API shapes implied by the UI              ║
║               ║ - Map screens to backend endpoints needed           ║
║               ║ - Output DESIGN-SPEC.md (dev-ready)                 ║
║               ║ - Create design-handoff.json (machine-readable)     ║
║ CANNOT        ║ - Write backend code · modify schema                ║
║               ║ - Skip API shape extraction (it's the whole point)  ║
║ WHEN TO RUN   ║ - After design is complete (STATUS.md: all DONE)    ║
║               ║ - Before /cert-precheck starts development          ║
║               ║ - When switching designer → developer               ║
║ OUTPUTS       ║ - DESIGN-SPEC.md (client-shareable)                 ║
║               ║ - ai/state/design-handoff.json (machine-readable)   ║
║               ║ - API contract requirements for dev team            ║
╚═══════════════╩══════════════════════════════════════════════════════╝

**The bridge between design and development.**

Why this exists:
  When design finishes, development starts blind.
  Every UI decision implies an API requirement the backend must satisfy.
  Without this handoff, developers discover those requirements mid-build —
  which causes rework, missed fields, wrong data shapes.

  This skill makes all design-implied API requirements explicit before
  a single line of backend code is written.

---

## STEP 1 — Read all completed design work

Read `ai/design/STATUS.md`.

If file missing or no items marked Done:
```
⚠️ No completed design work found.
   Run design skills first: /design-section · /design-layout · /design-review
   Then run /cortex-design-handoff when screens are marked Done.
```

For each completed screen/component:
- Read its design file if referenced in STATUS.md
- Note: components, data fields shown, interactions, states

Read (if exists):
- `ai/design/tokens.md` — color/typography/spacing system
- `ai/design/components/` — component-level decisions
- Any design-review outputs in `ai/design/reviews/`

---

## STEP 2 — Extract API shapes from UI

This is the critical step. For each screen/component, extract:

**What data does this UI display?**
→ These become the API response fields the backend must provide.

**What actions does the user perform?**
→ These become the API endpoints (POST/PUT/DELETE) the backend must handle.

**What filters/search/sort does the user control?**
→ These become query parameters the API must support.

Example extraction:
```
SCREEN: Customer Order List
─────────────────────────────────────────────────────
UI shows:
  - Order number, status badge, total, date, item count
  - Filter by: status (5 values) · date range
  - Sort by: date (default) · total
  - Pagination (20/page shown)
  - "Cancel" button visible when status = PENDING

→ API shape required:
  GET /api/orders
  Query params: status?, dateFrom?, dateTo?, sort?, page, limit
  Response: {
    data: Array<{
      id: string
      orderNumber: string
      status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
      total: number  // INR, display as ₹X
      createdAt: string  // ISO date
      itemCount: number
      canCancel: boolean  // computed: status === 'PENDING'
    }>
    meta: { total, page, limit, totalPages }
  }
```

Do this extraction for every completed screen. Be specific about field names and types — this becomes the dev contract.

---

## STEP 3 — Token inventory

Output the design token system:

```
DESIGN TOKENS
─────────────────────────────────────────────────────
Colors
  Primary:     [hex/variable]  — used for: [CTAs, links, etc.]
  Secondary:   [hex/variable]  — used for: [...]
  Background:  [hex/variable]
  Surface:     [hex/variable]
  Border:      [hex/variable]
  Error:       [hex/variable]
  Success:     [hex/variable]
  Warning:     [hex/variable]
  Text:        [hex/variable] (primary)
               [hex/variable] (secondary/muted)

Typography
  Heading:     [font-family · sizes · weights used]
  Body:        [font-family · sizes · line-height]
  Code/Mono:   [if used]

Spacing scale:  [4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px]
Border radius:  [sm · md · lg · full]
Shadow:         [sm · md · lg]
─────────────────────────────────────────────────────
Source: ai/design/tokens.md (if exists) · or extracted from design files
```

If no token system defined yet:
```
⚠️ No design tokens defined.
   Recommend: define tokens before frontend build to prevent inconsistency.
   Create: ai/design/tokens.md
```

---

## STEP 4 — Component inventory

List every reusable component identified in the design:

```
COMPONENT INVENTORY
─────────────────────────────────────────────────────
Component          Variants              Used in
─────────────────────────────────────────────────────
Button             primary · secondary   [screens]
                   danger · ghost
StatusBadge        [all order statuses]  order list, order detail
DataTable          sortable + filter     admin, order list
Modal              confirm · form        cancel order, edit profile
...
─────────────────────────────────────────────────────
Build order: Atoms → Molecules → Organisms → Pages
```

---

## STEP 5 — Screen-to-endpoint map

The complete API contract the backend must satisfy:

```
SCREEN → ENDPOINT MAP
─────────────────────────────────────────────────────
Screen                    Endpoints needed
─────────────────────────────────────────────────────
Login                     POST /api/auth/login
                          POST /api/auth/send-otp
                          POST /api/auth/verify-otp

Product listing           GET  /api/products?category&sort&page
Product detail            GET  /api/products/:slug

Cart                      GET  /api/cart
                          POST /api/cart/items
                          PATCH /api/cart/items/:id
                          DELETE /api/cart/items/:id
                          POST /api/cart/coupon

...
─────────────────────────────────────────────────────
Total endpoints required: [N]
Already built: [N] (cross-ref with api/STATUS.md or existing controllers)
To build: [N]
─────────────────────────────────────────────────────
```

---

## STEP 6 — Write output files

### 6A — DESIGN-SPEC.md (client-shareable)

Write to `ai/design/DESIGN-SPEC-[date].md`:

```markdown
# [Project Name] — Design Specification
Date: [ISO date] | Status: Handoff-ready

## 1. Screen inventory
[list of all completed screens with description]

## 2. Design tokens
[from Step 3]

## 3. Component library
[from Step 4]

## 4. API contract
[from Step 5 — screen-to-endpoint map with response shapes]

## 5. Interaction states
[loading · error · empty · success states for each screen]

## 6. Accessibility notes
[any ARIA, keyboard nav, color contrast decisions]

---
Ready for development. Run: /cert-precheck [module] "[task from design spec]"
```

### 6B — design-handoff.json (machine-readable for cert-precheck/cert-blueprint)

Write to `ai/state/design-handoff.json`:

```json
{
  "version": "1.0",
  "generatedAt": "[ISO timestamp]",
  "screens": [
    {
      "name": "[screen name]",
      "status": "design-complete",
      "components": ["Button", "DataTable"],
      "apiEndpoints": ["GET /api/orders", "POST /api/orders/:id/cancel"],
      "specFile": "ai/design/DESIGN-SPEC-[date].md"
    }
  ],
  "totalEndpointsRequired": 0,
  "endpointsAlreadyBuilt": 0,
  "endpointsToBuild": 0,
  "tokenSystem": "[defined | undefined]",
  "componentCount": 0
}
```

---

## STEP 7 — Update STATUS.md

Append to `ai/STATUS.md`:
```
[date] DESIGN HANDOFF COMPLETE
  Spec: ai/design/DESIGN-SPEC-[date].md
  Endpoints required: [N] ([N] to build)
  Components: [N] defined
  Tokens: [defined | undefined]
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      cortex-design-handoff v1.0
STATUS:     COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screens:    [N] handed off
Components: [N] inventoried
Tokens:     [defined | undefined]
Endpoints:  [N] required · [N] to build
Spec:       ai/design/DESIGN-SPEC-[date].md
Handoff:    ai/state/design-handoff.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT: /cert-precheck [first module] "[task from spec]"
      Dev reads DESIGN-SPEC.md before writing first line of code.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## INSTALL

```bash
cp C:\luv\Cortex\skills\cortex-design-handoff.md [project]\.claude\commands\cortex-design-handoff.md
```

Tier 1 skill — install to all projects (any project with a design phase needs this).
