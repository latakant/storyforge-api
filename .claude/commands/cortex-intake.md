╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-intake  |  v1.0  |  TIER: 1  |  BUDGET: LEAN      ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L0 (Blueprint) + L1 (Intent)                         ║
║ AUTHORITY     ║ ARCHITECT                                            ║
║ CAN           ║ - Ask founder questions conversationally             ║
║               ║ - Extract system primitives from natural language    ║
║               ║ - Produce structured IdeaBlueprint                  ║
║               ║ - Feed output directly into /cortex-blueprint        ║
║ CANNOT        ║ - Generate code                                      ║
║               ║ - Skip questions — all 15 serve a purpose            ║
║               ║ - Accept vague answers without gentle clarification  ║
║ WHEN TO RUN   ║ - When a founder can't write a structured idea       ║
║               ║ - Before /cortex-blueprint on any new project        ║
║               ║ - When idea is a vague analogy ("like Uber but...")  ║
║ OUTPUTS       ║ - IdeaBlueprint → ready to feed /cortex-blueprint    ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/cortex-intake — converts any founder idea into a structured system blueprint.

The gap this fills:
  /cortex-blueprint takes a structured idea.
  Real founders give unstructured ideas: "It's like Airbnb but for tailors."
  This skill bridges that gap — one question at a time, conversationally.

Who this is for:
  → Non-technical founders who can't write system specs
  → Developers starting a project with a vague brief
  → Anyone whose idea is still in "analogy" form

Output feeds directly into /cortex-blueprint.

$ARGUMENTS

Parse from $ARGUMENTS:
- Free-form idea text (optional — if given, use as starting context for Q1)
- `--fast` — ask only Q1–Q8 (core extraction, skip refinement questions)
- `--file <path>` — write IdeaBlueprint to file (default: ai/idea-brief.md)

---

## HOW TO CONDUCT THE INTAKE

One question at a time. Do NOT dump all 15 questions at once.
After each answer:
  - Acknowledge what was learned (one line)
  - Extract the system primitive it reveals
  - Ask the next question

If an answer is vague, ask ONE clarifying follow-up before moving on.
Do NOT ask more than one follow-up per question — keep momentum.

Tone: direct and curious, not bureaucratic. This is a conversation, not a form.

---

## THE 15 QUESTIONS

### Q1 — The Problem
**Ask:** "What problem are you solving? Be specific — whose problem, and what exactly goes wrong today?"

**Extracts:** Core pain · Who feels it · Current failure mode
**System primitive:** `problem` field + initial `actors` hint

---

### Q2 — Who Has the Problem
**Ask:** "Who are the different types of people in your system? Think about everyone who will use it or be affected by it."

**Extracts:** User roles · Stakeholders
**System primitive:** `actors[]` — becomes roles and permissions

---

### Q3 — Your Solution
**Ask:** "What is your solution in one sentence? Not the features — the core idea."

**Extracts:** Product type · Value proposition
**System primitive:** `productType` — maps to Cortex domain catalogue

---

### Q4 — The Core Transaction
**Ask:** "What is the ONE main action your system enables? Every product has one core transaction — what is yours?"

Examples to show if needed:
```
Uber → ride booking
Amazon → product purchase
Airbnb → accommodation booking
YouTube → video watching
TailorGrid → garment order placed
```

**Extracts:** Core transaction · Entry point of the system
**System primitive:** `coreTransaction` → becomes the main entity + workflow trigger

---

### Q5 — The Objects
**Ask:** "What are the main 'things' in your system? List the objects that get created, stored, or tracked."

**Extracts:** Domain entities
**System primitive:** `entities[]` — becomes database models

---

### Q6 — The Trigger
**Ask:** "What starts everything? What does a user DO to kick off the main process?"

**Extracts:** Workflow entry point
**System primitive:** `workflowTrigger` → Step 1 of the state machine

---

### Q7 — What Happens Next
**Ask:** "Walk me through the steps after the trigger — what happens, in what order, until the job is done?"

**Extracts:** Full workflow sequence
**System primitive:** `workflow[]` → becomes the state machine states

---

### Q8 — Approvals and Checkpoints
**Ask:** "Are there any steps where someone must approve or verify before the next step can happen? Who approves what?"

**Extracts:** Governance rules · Human-in-the-loop points
**System primitive:** `approvalGates[]` → becomes CRITICAL invariants

---

### Q9 — What Must Never Change
**Ask:** "Once something is recorded in your system, what information should be locked and never editable?"

Examples: "measurements after cutting begins" / "price at time of purchase" / "original transaction amount"

**Extracts:** Immutability rules
**System primitive:** `immutableFields[]` → becomes Law 3 (Immutable Transactions) enforcement

---

### Q10 — What Could Go Wrong
**Ask:** "What are the 3 most likely things that could go wrong in your system — from the user's perspective?"

**Extracts:** Edge cases · Failure modes · Risk areas
**System primitive:** `failureModes[]` → becomes Risk Analysis section of blueprint

---

### Q11 — Who Is Responsible When It Fails
**Ask:** "When something goes wrong, who owns fixing it — the platform, the user, or someone else?"

**Extracts:** Responsibility model · Ownership logic
**System primitive:** `ownershipRules` → becomes dispute resolution + escalation design

---

### Q12 — How Users Find Things
**Ask:** "How do users discover what they're looking for — do they search, browse categories, get recommendations, or something else?"

**Extracts:** Discovery engine type
**System primitive:** `discoveryEngine` → Search / Browse / Feed / Recommendation

---

### Q13 — How the Platform Makes Money
**Ask:** "How does this business make money? Commission, subscriptions, one-time purchase, ads, or something else?"

**Extracts:** Monetization model
**System primitive:** `monetizationModel` → maps to payment engine + billing design

---

### Q14 — Why Users Come Back
**Ask:** "Why would someone use this again tomorrow instead of going to a competitor? What makes them return?"

**Extracts:** Retention mechanism · Network effects
**System primitive:** `retentionEngine` → engagement features, loyalty loops

---

### Q15 — The Hybrid Check
**Ask:** "Is your product similar to any existing product you know? Or a combination of two things? For example: 'It's like X but for Y' or 'like X meets Y'."

**Extracts:** Platform archetype · Domain combination
**System primitive:** `platformArchetype` + `hybridDomains[]` → maps to Cortex domain adapters

---

## STEP: PRODUCE IDEABLUEPRINT

After all 15 questions, synthesize the answers into a structured output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX INTAKE — IDEA BLUEPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product Name:       [from Q3 or inferred]
Product Type:       [marketplace | saas | booking | ecommerce | cms | social | tool | hybrid]
Hybrid Domains:     [if applicable — e.g. "marketplace + booking"]

Problem:            [Q1]
Actors:             [Q2 — comma-separated roles]
Core Transaction:   [Q4 — the one main action]

Entities:
  [Q5 — bullet list]

Core Workflow:
  [Q6 trigger] → [Q7 steps in order]

State Machine ([main entity]):
  [inferred states from Q7 workflow, formatted as state names]
  Example: CREATED → ACCEPTED → IN_PROGRESS → COMPLETED → CANCELLED

Approval Gates:
  [Q8 — who approves what, at which step]

Immutable Fields:
  [Q9 — list]

Failure Modes:
  [Q10 — top 3]

Ownership Rules:
  [Q11]

Discovery Engine:  [Q12 — search / feed / browse / recommendation]
Monetization:      [Q13]
Retention:         [Q14]
Platform Archetype: [Q15]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX DOMAIN MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Map the idea to Cortex's 15-domain catalogue + which adapters apply]

Primary domains:   [list from Domain Catalogue]
Adapters needed:   [nestjs-patterns · ecom-orders · booking-core · etc.]
Laws to enforce:   [list the most critical System Laws for this product type]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READY FOR BLUEPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run next (recommended order):
  /cortex-validate            ← stress-test the idea before investing in architecture
  OR (if already validated):
  /cortex-plan new "[product name]"
  OR
  /cortex-blueprint idea "[product name — [one-line description]]" app-type [type]

Note: /cortex-validate reads ai/idea-brief.md automatically — no extra args needed.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Write this output to `ai/idea-brief.md` (or path given in `--file`).

---

## EXAMPLE RUN

```
/cortex-intake

→ Q1: What problem are you solving?
Founder: "Customers can't find reliable tailors and tailors have no way to manage orders properly."

→ Learned: Pain on both sides — marketplace problem.
→ Q2: Who are the different types of people in your system?

Founder: "Customers, tailors, and our ops team who coordinate everything."

→ Learned: 3 actors — customer · tailor · ops. Likely a B2B2C marketplace with internal ops role.
→ Q3: What is your solution in one sentence?

Founder: "A platform where customers place garment orders that our ops team coordinates with verified tailors."

→ Learned: Managed marketplace (not pure P2P — ops is in the middle).
→ Q4: What is the ONE main action your system enables?
...
[continues until Q15]
...

→ IdeaBlueprint produced → ai/idea-brief.md written
→ Next: /cortex-blueprint idea "TailorGrid" app-type marketplace
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Intake
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS   : COMPLETE
Extracted: [N] system primitives from founder input
File     : ai/idea-brief.md written
Domains  : [list detected]
Adapters : [list recommended]
Next     : /cortex-validate                   ← recommended first
           OR /cortex-plan new "[product]"
           OR /cortex-blueprint idea "[one-liner]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
