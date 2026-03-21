╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cortex-validate  |  v1.0  |  TIER: 1  |  BUDGET: LEAN   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L0 (Pre-Blueprint) · L1 (Intent)                    ║
║ AUTHORITY     ║ ANALYST                                             ║
║ CAN           ║ - Score any idea against 5 validation dimensions    ║
║               ║ - Output structured Idea Report with X/10 score     ║
║               ║ - Recommend: PROCEED / PIVOT / ABANDON              ║
║               ║ - Feed validated blueprint into /cortex-blueprint   ║
║ CANNOT        ║ - Generate architecture or code                     ║
║               ║ - Skip dimensions — all 5 run on every idea         ║
║               ║ - Guarantee market success (it's analysis, not fact)║
║ WHEN TO RUN   ║ - After /cortex-intake, before /cortex-blueprint    ║
║               ║ - When founder doubts whether idea is worth building ║
║               ║ - When pivoting — re-validate the new direction     ║
║ OUTPUTS       ║ - Idea Score Report · PROCEED / PIVOT / ABANDON rec ║
╚═══════════════╩══════════════════════════════════════════════════════╝

/cortex-validate — Idea Stress Test Engine.

The gap this fills:
  Most AI tools skip straight to architecture.
  Real builders validate the idea first:
    "Is this problem real? Is the market ready? Can we build it? Can we make money?"
  This skill answers those questions before any blueprint is drawn.

Why this is the right first step:
  The most expensive mistake in product development is building the wrong thing.
  Catching it here costs 10 minutes. Catching it after 6 months of code costs everything.

Input:
  → IdeaBlueprint from /cortex-intake (preferred)
  → OR raw idea text directly

Output feeds into:
  → /cortex-blueprint (if PROCEED)
  → /cortex-intake (if PIVOT — re-run intake with refined idea)

---

$ARGUMENTS

Parse from $ARGUMENTS:
- Free-form idea text (if no intake has been run yet)
- `--file <path>` — read IdeaBlueprint from file (default: ai/idea-brief.md)
- `--output <path>` — write Idea Report to file (default: ai/idea-report.md)
- `--strict` — ABANDON threshold raised: score < 6 → ABANDON (default: < 4)

---

## INPUT LOADING

### If IdeaBlueprint exists (ai/idea-brief.md or --file path):
Read it. Extract:
- problem
- actors
- coreTransaction
- monetizationModel
- failureModes
- productType
- platformArchetype

### If no blueprint file:
Use $ARGUMENTS text as raw idea. Extract what you can.
Note: "Running without IdeaBlueprint — some dimensions may have lower confidence."

---

## THE 5 VALIDATION DIMENSIONS

Score each dimension 0–10. Weight is shown in brackets.
Final score = weighted average across all 5.

---

### DIMENSION 1 — Problem Strength [weight: 30%]

Evaluate the problem being solved:

**Questions to reason through:**
- Is the problem specific and clearly stated, or vague?
- Who exactly experiences it? (named user group vs "everyone")
- How often does it occur? (daily pain vs occasional inconvenience)
- How painful is it? (blocks user from doing something vs mild annoyance)
- Is the current solution (workaround) truly inadequate?

**Scoring guide:**
```
0–3  Vague problem, hard to identify who suffers, rare occurrence
4–6  Identifiable problem, specific user group, happens occasionally
7–9  Clear pain, specific user, frequent occurrence, bad current solution
10   Acute daily pain for a well-defined group with no good alternative
```

**Output for this dimension:**
```
DIMENSION 1 — Problem Strength
Score:        [X/10]
User group:   [specific or vague?]
Frequency:    [daily / weekly / occasional / rare]
Pain level:   [blocks workflow / significant friction / minor inconvenience]
Current fix:  [what users do now — and why it's bad]
Verdict:      [1-sentence assessment]
```

---

### DIMENSION 2 — Market Reality [weight: 25%]

Evaluate whether the market is real and accessible:

**Questions to reason through:**
- Are there existing competitors? (competition = market validation)
- Is this market saturated? (too many = hard to enter, but 0 = maybe no market)
- Is the market large enough to build a business? (niche ok if premium)
- Is timing right? (too early = no users, too late = too crowded)
- Can this product acquire users without huge spend?

**Scoring guide:**
```
0–3  No clear market, OR completely saturated with giants, no differentiation path
4–6  Market exists but crowded or unclear acquisition strategy
7–9  Real market, clear differentiation, reachable users, good timing
10   Underserved market, clear acquisition path, favorable timing
```

**Output for this dimension:**
```
DIMENSION 2 — Market Reality
Score:         [X/10]
Competitors:   [list known ones, or "none identified"]
Saturation:    [underserved / competitive / saturated]
Market size:   [small niche / medium / large / massive]
Timing:        [too early / right time / late]
Differentiation path: [what makes this different — or "unclear"]
Verdict:       [1-sentence assessment]
```

---

### DIMENSION 3 — Technical Feasibility [weight: 20%]

Evaluate whether this can realistically be built:

**Questions to reason through:**
- How technically complex is the core transaction? (CRUD vs real-time vs ML vs hardware)
- Are there hard technical dependencies? (maps, AI models, IoT, compliance APIs)
- What's the minimum viable version? Is it buildable by a small team?
- Are there regulatory or data-handling constraints? (healthcare, fintech, user data)
- What could break technically that is non-trivial to fix?

**Scoring guide:**
```
0–3  Requires cutting-edge AI/hardware, unclear if possible, massive infra
4–6  Buildable but requires specialized expertise or significant infrastructure
7–9  Achievable with standard web stack, known patterns, manageable complexity
10   MVP achievable in weeks with existing tools, no exotic dependencies
```

**Output for this dimension:**
```
DIMENSION 3 — Technical Feasibility
Score:           [X/10]
Core complexity: [CRUD / real-time / ML / hardware / regulatory]
Hard dependencies: [list anything exotic or uncertain]
MVP buildable?   [yes — standard stack / yes — specialized / uncertain / no]
Regulatory risk: [none / low / medium — [specify] / high — [specify]]
Verdict:         [1-sentence assessment]
```

---

### DIMENSION 4 — Monetization Clarity [weight: 15%]

Evaluate whether there is a clear path to revenue:

**Questions to reason through:**
- Is there a clear monetization model? (subscription, commission, freemium, ads, etc.)
- Who pays and when? (user pays at transaction vs monthly vs enterprise contract)
- Is the willingness-to-pay plausible for this user group?
- How long until first revenue? (direct vs delayed)
- Is unit economics realistic? (CAC vs LTV)

**Scoring guide:**
```
0–3  No monetization model, or asking free users to pay for something free elsewhere
4–6  Some model exists but payment timing, willingness-to-pay, or LTV is unclear
7–9  Clear model, known who pays, plausible price point, reasonable CAC/LTV
10   Obvious monetization, multiple revenue streams, strong unit economics
```

**Output for this dimension:**
```
DIMENSION 4 — Monetization Clarity
Score:            [X/10]
Model:            [subscription / commission / freemium / ads / one-time / B2B / other]
Who pays:         [end user / business / platform / advertiser]
Price point:      [plausible / unclear / too high for segment / too low to sustain]
Time to revenue:  [immediate / weeks / months / 1+ year]
Verdict:          [1-sentence assessment]
```

---

### DIMENSION 5 — Execution Risk [weight: 10%]

Evaluate the risk profile of actually building and launching this:

**Questions to reason through:**
- What are the 3 most likely ways this fails?
- Are any of those failure modes existential (regulatory shutdown, dependency, trust)?
- Is the founder/team well-positioned to execute this? (domain expertise required?)
- What external factors could kill this? (platform risk, law change, economic shift)
- Is the feedback loop fast enough to course-correct?

**Scoring guide:**
```
0–3  High existential risk (regulatory, trust, single dependency), no clear mitigation
4–6  Manageable risks with some mitigation, but execution requires specific expertise
7–9  Low-risk execution, known patterns, fast feedback loop, no single point of failure
10   Very low risk, team well-positioned, many paths to success, fast iteration possible
```

**Output for this dimension:**
```
DIMENSION 5 — Execution Risk
Score:           [X/10]
Top 3 risks:     [list]
Existential?:    [yes — [which] / no]
Team fit:        [strong / neutral / gap — [what's missing]]
External risk:   [regulatory / platform / market / none significant]
Feedback loop:   [fast (days) / medium (weeks) / slow (months)]
Verdict:         [1-sentence assessment]
```

---

## FINAL SCORE CALCULATION

```
Weighted score:
  D1 Problem Strength    × 0.30 = [X]
  D2 Market Reality      × 0.25 = [X]
  D3 Technical Feasibility × 0.20 = [X]
  D4 Monetization Clarity × 0.15 = [X]
  D5 Execution Risk      × 0.10 = [X]
  ──────────────────────────────────
  IDEA SCORE:                 [X.X / 10]
```

---

## RECOMMENDATION ENGINE

Based on final score AND individual dimension flags:

**PROCEED** — Score ≥ 7.0 AND no single dimension < 4
  → "Idea is strong. Proceed to architecture."
  → Next: `/cortex-blueprint idea "[idea]" app-type [type]`

**PROCEED WITH CAUTION** — Score 5.5–6.9 OR one dimension < 4
  → "Idea has merit but [weakest dimension] needs addressing."
  → List specific improvements before building.
  → Next: Address weaknesses, then `/cortex-blueprint`

**PIVOT** — Score 4.0–5.4 OR two dimensions < 4
  → "Core idea has potential but direction needs adjustment."
  → Output specific pivot suggestions (change target user / monetization / scope).
  → Next: `/cortex-intake` with refined idea, then re-validate.

**ABANDON** — Score < 4.0 OR any existential risk flagged
  → "This idea as stated has critical weaknesses."
  → Output honest assessment of what would need to change fundamentally.
  → Do not proceed to blueprint.

Default thresholds. Override with `--strict` flag (raises ABANDON from < 4.0 to < 6.0).

---

## IDEA REPORT OUTPUT

Write to `ai/idea-report.md` (or --output path):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — IDEA STRESS TEST REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Idea:         [product name or one-liner]
Date:         [today]
Source:       [IdeaBlueprint file | raw text]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORES
─────────────────────────────────────────────────
D1  Problem Strength       [X/10]  [weight: 30%]
D2  Market Reality         [X/10]  [weight: 25%]
D3  Technical Feasibility  [X/10]  [weight: 20%]
D4  Monetization Clarity   [X/10]  [weight: 15%]
D5  Execution Risk         [X/10]  [weight: 10%]
─────────────────────────────────────────────────
    IDEA SCORE             [X.X/10]
─────────────────────────────────────────────────

STRENGTHS
  + [top 2-3 things working for this idea]

WEAKNESSES
  - [top 2-3 things working against this idea]

CRITICAL FLAGS (if any)
  ⚠️  [any single dimension < 4 or existential risk]

RECOMMENDATION: [PROCEED | PROCEED WITH CAUTION | PIVOT | ABANDON]

[If PIVOT: specific pivot suggestions]
[If PROCEED WITH CAUTION: specific improvements needed first]
[If ABANDON: honest breakdown of fundamental issues]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[If PROCEED or PROCEED WITH CAUTION:]
  /cortex-blueprint idea "[idea]" app-type [type]

[If PIVOT:]
  Refine the idea based on suggestions above.
  Then: /cortex-intake → /cortex-validate

[If ABANDON:]
  Fundamental rethink needed before any further work.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## HONESTY RULE

This is an analytical tool, not a cheerleader.
If an idea scores low, say so clearly.
Founders who skip validation waste months. Honest scores save time.

Never inflate scores to seem encouraging.
Never deflate scores to seem rigorous.
Score what the evidence supports.

---

## LOG

```bash
node scripts/lifecycle.js log --action=INSIGHT --module=cortex \
  --detail="VALIDATE: [idea-name] · score=[X.X] · rec=[PROCEED|PIVOT|ABANDON] · weakest=[D1-D5]"
```

---

## Completion block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Validate
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS      : COMPLETE
Idea        : [name]
Score       : [X.X / 10]
Recommendation: [PROCEED | PROCEED WITH CAUTION | PIVOT | ABANDON]
Weakest dim : [D1-D5 — dimension name]
File        : ai/idea-report.md written
Next        : [next skill based on recommendation]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
