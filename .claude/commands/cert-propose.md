# cortex-propose — Project Proposal Generator
> Use when: starting a new project OR presenting an existing one to stakeholders.
> Produces two documents: a technical proposal (dev) + a business proposal (founder/investor).
> Works for both new projects (from description) and existing projects (from codebase).

---

## Usage

```
/cortex-propose new      → generate proposal from scratch (takes business description)
/cortex-propose existing → generate proposal from current codebase (runs /cortex-discover first)
/cortex-propose report   → generate stakeholder report for current project
```

---

## MODE: NEW PROJECT

### Step 1 — Gather requirements

Ask the user (or read from $ARGUMENTS):
```
1. Business description:  What does this product do? Who is it for?
2. Business type:         E-commerce / SaaS / Marketplace / Fintech / Other
3. Primary market:        India / Global / Specific region
4. Target users:          B2C / B2B / Both
5. Scale target:          MVP / Growth / Enterprise
6. Team size:             Solo / Small (2-5) / Medium (6-20)
7. Timeline:              Weeks to MVP
8. Known constraints:     Budget / Tech / Compliance
```

### Step 2 — Tech stack recommendation

Based on business type + team size + scale target, recommend:

```
RECOMMENDED STACK
═══════════════════════════════════════════
Backend:    [NestJS | Express | FastAPI | Django | Spring]
  Reason:   [why this fits their context]

Frontend:   [Next.js | Nuxt | React SPA | None]
  Reason:   [why]

Database:   [PostgreSQL | MySQL | MongoDB]
  Reason:   [why]

Auth:       [JWT + OTP | JWT + Password | OAuth | Session]
  Reason:   [why for their market]

Payments:   [Razorpay (India) | Stripe (Global) | Both]
  Reason:   [market fit]

Queue:      [BullMQ | Celery | None for MVP]
  Reason:   [scale justification]

Hosting:    [Railway | Render | AWS | GCP | Vercel+Railway]
  Reason:   [cost + complexity for their scale]
═══════════════════════════════════════════
```

### Step 3 — Architecture blueprint

Generate a system architecture diagram (text-based):

```
[User] ──→ [Frontend: Next.js] ──→ [API: NestJS] ──→ [PostgreSQL]
                                          │
                                    ┌─────┴─────┐
                              [Redis cache] [BullMQ queue]
                                          │
                              [Razorpay] [Cloudinary] [Resend]
```

### Step 4 — Feature registry (PRD skeleton)

Based on business type, generate the feature list with priorities:

```
PHASE 1 — MVP (must have for launch)
  [ ] Authentication (OTP / email)
  [ ] [core feature 1]
  [ ] [core feature 2]
  [ ] [core feature 3]
  [ ] Basic admin panel

PHASE 2 — Growth (post-launch)
  [ ] [growth feature 1]
  [ ] [growth feature 2]
  [ ] Analytics

PHASE 3 — Scale
  [ ] [scale feature 1]
  [ ] Performance optimisation
  [ ] Advanced reporting
```

### Step 5 — Effort estimate

```
EFFORT ESTIMATE
════════════════════════════════
Backend API:      [S/M/L] — [N-M weeks]
Frontend Web:     [S/M/L] — [N-M weeks]
Admin Panel:      [S/M/L] — [N-M weeks]
Infrastructure:   [S/M/L] — [N-M days]
Testing:          [S/M/L] — [N-M weeks]
────────────────────────────────
Total MVP:        [N-M weeks] with [team size]
Total v1.0:       [N-M weeks]
════════════════════════════════
```

Sizing: S = < 1 week, M = 1-3 weeks, L = 3+ weeks

### Step 6 — Risk assessment

```
RISK REGISTER
═══════════════════════════════════════════════════
Risk                        | Likelihood | Impact | Mitigation
Payment integration delay   | MEDIUM     | HIGH   | Start early, use sandbox
Compliance (GST/KYC)        | HIGH       | HIGH   | Engage CA/legal early
Scope creep                 | HIGH       | MEDIUM | Lock MVP scope before dev
Third-party API downtime    | LOW        | HIGH   | Circuit breaker + fallback
═══════════════════════════════════════════════════
```

---

## MODE: EXISTING PROJECT (from codebase)

If `ai/PROJECT_INTELLIGENCE.md` does not exist → run `/cortex-discover` first.
If it exists → read it and skip to document generation.

---

## OUTPUT — TWO DOCUMENTS

### Document 1: Technical Proposal (`ai/reports/PROPOSAL-DEV-[date].md`)

For: Developers, CTOs, technical co-founders

```markdown
# [Project Name] — Technical Proposal
Date: [ISO date] | Prepared by: CORTEX

## Executive Summary (3 lines)

## Tech Stack
[from Phase 2]

## System Architecture
[diagram from Phase 3]

## Module Breakdown
[list of modules with: purpose, endpoints, models, estimated effort]

## Database Schema Overview
[key models and relations]

## API Design Standards
[pagination, error handling, auth pattern]

## Infrastructure Plan
[hosting, CI/CD, monitoring]

## Security Considerations
[auth, OWASP, data protection]

## Feature Registry
[Phase 1 / 2 / 3 breakdown]

## Effort Estimate
[detailed breakdown from Phase 5]

## Risk Register
[from Phase 6]

## CORTEX Governance
[explains the AI governance system built in]
```

### Document 2: Business Proposal (`ai/reports/PROPOSAL-FOUNDER-[date].md`)

For: Founders, investors, non-technical stakeholders
**Zero technical jargon. Plain English only.**

```markdown
# [Project Name] — Product Proposal
Date: [ISO date]

## What This Product Does
[1 paragraph, plain English, no code terms]

## Who It's For
[target users, market size if known]

## What We're Building (Phase 1)
[feature list in user language — "customers can track their orders"
 not "order status endpoint with 7-state machine"]

## What It Will Cost to Build
[effort estimate in calendar weeks, not story points]
[optional: rough cost range if team rates are known]

## What Could Go Wrong (And How We Handle It)
[risk register translated to business language]

## What Comes After Launch
[Phase 2 + 3 in plain English]

## Technology Choices (Why They Matter to You)
[brief explanation of key tech choices and their business benefit
 e.g. "We use PostgreSQL because your financial data needs ACID guarantees
 — this means two people can't accidentally place the same order at the same time"]

## Timeline
[visual or table: weeks to MVP → beta → launch → v1.0]

## What We Need From You
[decisions, approvals, or inputs required from the business side]
```

---

## STEP [LOG]

```bash
node scripts/lifecycle.js log --action=INSIGHT --module=cortex \
  --detail="PROPOSAL_GENERATED: type=[new|existing] mode=[new|report] documents=[2]"
```

Append to `ai/lifecycle/LAYER_LOG.md`:
```
TYPE: ANALYSIS
PROJECT: [project name]
ROLE: PRINCIPAL_ARCHITECT
LAYER_ORIGIN: L4_SERVICE
LAYERS_TOUCHED: L4_SERVICE
LAYER_VIOLATED: NONE
FRONTEND_IMPACT: NONE
PA_REQUIRED: NO
MODULE: cortex
FILES: ai/reports/PROPOSAL-DEV-[date].md, ai/reports/PROPOSAL-FOUNDER-[date].md
DETAIL: /cortex-propose [mode] — 2 documents generated for [project name]
```

---

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-propose                 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Files      ai/reports/PROPOSAL-DEV-{date}.md · PROPOSAL-FOUNDER-{date}.md
Stack      {recommended stack}
Effort     {estimate}
Logged     LAYER_LOG (TYPE: INSIGHT) · {date}
Next       Share PROPOSAL-FOUNDER with stakeholders | /cortex-init on new project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
