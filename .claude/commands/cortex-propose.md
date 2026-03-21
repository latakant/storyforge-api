# /cortex-propose — Project Proposal Generator
# CORTEX v11.3 | Previously: cert-propose.md (renamed — cert-* = governance, cortex-* = deliverable tools)
# Produces: technical proposal (dev) + business proposal (founder/investor)

> Use when: presenting a new or existing project to stakeholders or a client.
> Works for both new projects (from description) and existing projects (from codebase).

---

## Usage

```
/cortex-propose new       → generate proposal from scratch (takes business description)
/cortex-propose existing  → generate proposal from current codebase (/cortex-discover first)
/cortex-propose report    → stakeholder update report for current project
/cortex-propose estimate  → cost + timeline only (links to cert-estimate output)
```

---

## MODE: NEW PROJECT

### Step 1 — Gather requirements

Read from $ARGUMENTS or ask:
```
1. Business description:  What does this product do? Who is it for?
2. Primary risk type:     Money moves (Risk A) · Multi-tenant (Risk B) ·
                          Content/scale (Risk C) · API-first (Risk D)
3. Primary market:        India / Global / Specific region
4. Target users:          B2C / B2B / Both
5. Scale target:          MVP / Growth / Enterprise
6. Team size:             Solo / Small (2–5) / Medium (6–20)
7. Known constraints:     Budget / Tech / Compliance
```

Run `/cert-estimate "[description]"` to get calibrated timeline + cost data.
Reference that output in Step 5 — do NOT invent estimates.

### Step 2 — Tech stack recommendation

Based on risk type + team size + scale target:

```
RECOMMENDED STACK
═══════════════════════════════════════════════════
Risk A (transactions)  → NestJS + Prisma + PostgreSQL
  Reason: $transaction support · HMAC webhook handling
Risk B (multi-tenant)  → NestJS + row-level isolation + Redis
  Reason: tenant middleware · session isolation
Risk C (scale/content) → NestJS + BullMQ + Redis feed
  Reason: async fan-out · queue-backed notifications
Risk D (API-first)     → NestJS + OpenAPI + rate limiting
  Reason: Swagger-first · API key management built-in

Frontend:   Next.js 15 App Router + Tailwind
  Reason:   Admin + customer portal on same stack
            React Server Components for static/SEO pages

Payments:   Razorpay (India) | Stripe (Global)
Hosting:    Docker + Coolify/Railway (MVP) · AWS/GCP (scale)
═══════════════════════════════════════════════════
```

### Step 3 — Architecture diagram

```
[User] → [Frontend: Next.js :3000]  ─┐
[Admin] → [Admin: Next.js :3001]    ─┼→ [API: NestJS :4000] → [PostgreSQL 16]
[Mobile (future)] ────────────────── ┘         │
                                         ┌──────┴──────┐
                                    [Redis 7]     [BullMQ]
                                         │
                               [Razorpay | Stripe]
                               [Cloudinary | S3]
                               [MSG91 | Resend]
```

Adapt to detected risk type — show relevant integrations only.

### Step 4 — MVP scope (phase breakdown)

```
PHASE 1 — MVP (must have for launch)
─────────────────────────────────────
[ ] Foundation (scaffold · auth · RBAC)
[ ] [core domain feature 1]
[ ] [core domain feature 2]
[ ] Payments (if Risk A)
[ ] Admin panel (CRUD + tables)

PHASE 2 — Growth (post-traction)
─────────────────────────────────
[ ] [growth feature 1 — what users ask for at scale]
[ ] Analytics + reporting
[ ] Performance optimization

PHASE 3 — Scale
─────────────────
[ ] [scale feature — real-time, ML, multi-region]
[ ] Infrastructure upgrade
```

Derive from cert-estimate module list — same modules, phase split.

### Step 5 — Effort + cost (from cert-estimate)

Reference cert-estimate output. Do NOT invent numbers.

```
EFFORT ESTIMATE (source: cert-estimate)
════════════════════════════════════════
Solo developer:    [N–N weeks]  ₹[X]L – ₹[X]L
2-person team:     [N–N weeks]  ₹[X]L – ₹[X]L
Small agency:      [N–N weeks]  ₹[X]L – ₹[X]L
════════════════════════════════════════
⚠️ Uncertainty band: ±30%
   Calibration: Exena India (real project, 2026)
```

### Step 6 — Risk register

```
RISK REGISTER
═══════════════════════════════════════════════════════════
Risk                        Likelihood  Impact  Mitigation
Payment integration delay   MEDIUM      HIGH    Start early, use sandbox
GST/compliance              HIGH        HIGH    Engage CA/legal before build
Scope creep                 HIGH        MEDIUM  Lock MVP scope in writing
3rd-party API instability   LOW         HIGH    Circuit breaker + fallback
═══════════════════════════════════════════════════════════
```

Tailor to detected risk type — add type-specific risks.

### Step 7 — Client sign-off gate

Output this before proceeding to blueprint:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏸  SCOPE APPROVAL REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before development begins, confirm:

  [ ] MVP scope agreed (Phase 1 only)
  [ ] Cost range accepted: ₹[X]L – ₹[X]L
  [ ] Timeline accepted: [N]–[N] weeks
  [ ] Stack approved: [stack]
  [ ] Phase 2+ deferred until traction

Human confirms → /cert-blueprint "[project description]"
Client rejects → /cert-estimate --revise "[what changed]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## MODE: EXISTING PROJECT (from codebase)

If `ai/PROJECT_INTELLIGENCE.md` does not exist → run `/cortex-discover` first.
If it exists → read it and generate documents from current state.

---

## OUTPUT — TWO DOCUMENTS

### Document 1: Technical Proposal (`ai/reports/PROPOSAL-DEV-[date].md`)

For: Developers, CTOs, technical co-founders.

```markdown
# [Project Name] — Technical Proposal
Date: [ISO] | Prepared by: CORTEX v11.3

## Executive Summary (3 sentences)

## Risk Category + App Type
[from cert-app-type output]

## Recommended Stack + Why
[from Step 2]

## Architecture
[diagram from Step 3]

## MVP Module Breakdown
[from cert-estimate module table — backend + frontend days per module]

## Database Schema Overview
[key models and relations]

## API Design Standards
[pagination format · error codes · auth pattern · webhook pattern]

## Infrastructure Plan
[hosting · CI/CD · monitoring]

## Security Considerations
[auth · OWASP · data protection · payment security if Risk A]

## MVP Scope (Phase 1)
[Phase 1/2/3 breakdown from Step 4]

## Effort Estimate
[cert-estimate output — ranges, not fixed numbers]

## Risk Register
[from Step 6]

## CORTEX Governance
Governed by CORTEX v11.3. Every session, commit, and feature
passes through automated quality gates. Score threshold: 95/100.
```

### Document 2: Business Proposal (`ai/reports/PROPOSAL-FOUNDER-[date].md`)

For: Founders, investors, non-technical stakeholders.
**Zero technical jargon. Plain English only.**

```markdown
# [Project Name] — Product Proposal
Date: [ISO]

## What This Product Does
[1 paragraph, user language — what problem it solves, who it's for]

## Who It's For
[target users · market context]

## What We're Building First (MVP)
[feature list in user language:
  "Customers can browse products and add them to a cart"
  NOT "product catalog endpoint with variant matrix"]

## What It Will Cost
[cost range in INR · timeline in weeks · team scenario]
[Honest note: "Estimates carry ±30% uncertainty — exact numbers come after discovery"]

## What Could Go Wrong
[risk register in plain English]

## What Comes After Launch
[Phase 2 + 3 in user language]

## Technology Choices (Why They Matter to You)
[each tech choice translated to business benefit:
  "We use PostgreSQL because two customers can't accidentally
   buy the same last-in-stock item at the same time"]

## Timeline
[Week 1–2: Setup · Week 3–8: Build · Week 9–10: Test · Week 11: Launch]

## What We Need From You
[explicit list: decisions, approvals, content, accounts required]
[client sign-off: "Your signature here means Phase 1 scope is locked"]
```

---

## STEP [LOG]

```bash
node scripts/lifecycle.js log --action=INSIGHT --module=cortex \
  --detail="PROPOSAL_GENERATED: type=[new|existing] documents=2"
```

---

## COMPLETION BLOCK

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      cortex-propose v1.1
STATUS:     COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Documents:  PROPOSAL-DEV-[date].md · PROPOSAL-FOUNDER-[date].md
Stack:      [recommended stack]
Estimate:   [from cert-estimate — range]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏸  WAITING: client/founder scope approval
   Approved → /cert-blueprint "[project]"
   Revised  → /cert-estimate --revise "[what changed]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## INSTALL

```bash
cp C:\luv\Cortex\skills\cortex-propose.md [project]\.claude\commands\cortex-propose.md
```
