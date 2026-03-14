╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-orchestrate  |  v1.0  |  TIER: 5  |  BUDGET: HIGH  ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L4 · L5 · L6                                   ║
║ AUTHORITY     ║ ORCHESTRATOR                                         ║
║ CAN           ║ - Chain CORTEX skills in sequence                    ║
║               ║ - Spawn agents with structured handoff docs          ║
║               ║ - Produce per-phase outputs                          ║
║ CANNOT        ║ - Skip security-reviewer for auth/payment code       ║
║               ║ - Proceed to next phase if previous phase fails      ║
║ WHEN TO RUN   ║ - Full feature workflow (plan → code → review → sec) ║
║               ║ - Multi-phase refactoring                            ║
║               ║ - Complex bug fix requiring root cause + test + fix  ║
║ OUTPUTS       ║ - SHIP / NEEDS WORK / BLOCKED verdict + phase report ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Sequential agent workflow for complex tasks. Each agent produces a
structured HANDOFF document that is the input for the next agent.
Stop-loss: if any phase produces BLOCKED, halt immediately.

$ARGUMENTS

Parse workflow type from $ARGUMENTS:
- `graph` — run full task graph from ai/task-graph.json in dependency order  ← PRIMARY MODE
- `feature <description>` — full feature workflow
- `bugfix <description>` — bug investigation and fix
- `refactor <description>` — safe refactoring
- `security <description>` — security-focused review
- `custom "<agents>" <description>` — custom agent sequence

---

## WORKFLOW TYPES

### graph (task-graph-driven — PRIMARY)

Reads `ai/task-graph.json` and executes all nodes in dependency order.
Automatically parallelizes independent nodes at each dependency level.

```
Level 0 (no deps):      schema nodes → run first
Level 1 (deps on L0):   migration + service → run in parallel after L0
Level 2 (deps on L1):   endpoint + auth + queue → run in parallel after L1
Level 3 (deps on L2):   test + component + service-fe → run in parallel after L2
Level 4 (deps on L3):   page → after components
Level 5 (deps on L4):   e2e → after page + endpoint
Level N (all done):     deploy → last
```

Execution loop:
1. Read graph. Find NEXT-ready nodes (pending, all deps done).
2. If multiple NEXT-ready → run in parallel via `cert-parallel graph`.
3. Mark each done as it completes. Re-check for newly unlocked nodes.
4. If a node is BLOCKED → halt that branch. Continue other branches if independent.
5. Repeat until all nodes done or all branches blocked.

Resume support:
- If graph already has `done` nodes → skip them, start from first pending.
- Output: "Resuming — [N] nodes already done, [M] remaining."

---

### feature
```
planner → tdd-guide → code-reviewer → security-reviewer
```
Use for: new endpoints, new modules, new business logic.

### bugfix
```
planner → tdd-guide → code-reviewer
```
Use for: fixing a known issue (write regression test first, then fix).

### refactor
```
architect → code-reviewer → tdd-guide
```
Use for: restructuring existing code without changing behavior.

### security
```
security-reviewer → code-reviewer → architect
```
Use for: security audit of existing code, pre-launch review.

---

## HANDOFF DOCUMENT FORMAT

Between each phase, create a handoff document:

```markdown
## HANDOFF: [previous-agent] → [next-agent]

### Context
[What was done in this phase — 2–3 sentences]

### Findings
[Key discoveries, decisions made, patterns used]

### Files Modified
- `src/modules/X/X.service.ts` — [what changed]
- `src/modules/X/X.spec.ts` — [what tests added]

### Open Questions
[Unresolved items for the next agent to handle]

### Recommendations
[What the next agent should focus on]
```

---

## EXECUTION

### Step 0 — Graph mode check
If argument is `graph`:
- Read `ai/task-graph.json`
- Check for existing progress (any `done` nodes → resume mode)
- Execute the graph loop (see WORKFLOW TYPES > graph above)
- Skip Steps 1–5 below (graph loop replaces manual phase execution)

### Step 1 — Parse workflow
Identify the workflow type and task description from $ARGUMENTS.

### Step 2 — Run Phase 1
Invoke the first agent with the full task description + project context.
Collect its output. Check verdict — if BLOCKED, halt.

### Step 3 — Build handoff
Format the HANDOFF document from Phase 1 output.

### Step 4 — Run Phase 2+
Each subsequent agent receives:
- The original task description
- The HANDOFF document from the previous phase
- Access to the files listed in Files Modified

Repeat until all phases complete.

### Step 5 — Parallel phases (when applicable)
For independent checks (e.g., code-reviewer + security-reviewer),
run them simultaneously via `cert-parallel graph`.

---

## FINAL REPORT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-orchestrate             COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workflow    {graph/feature/bugfix/refactor/security}
Task        {description}
Phases      {N} completed

GRAPH STATE (if graph mode)
─────────────────────────────
Total       {N} nodes
Done        {N} ✅
Blocked     {N} 🚫 — [list blocked node ids]
Remaining   {N} ⏸

PHASE RESULTS
─────────────
Planner         DONE — plan approved, 3 phases
TDD Guide       DONE — 8 tests written, all pass, 84% coverage
Code Reviewer   WARN — 1 HIGH issue addressed inline
Security        APPROVE — no CRITICAL or HIGH

FILES CHANGED
─────────────
{list all files modified across all phases}

TEST RESULTS
─────────────
{pass/fail counts, coverage}

VERDICT: SHIP ✔ / NEEDS WORK ⚠ / BLOCKED ✖
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: /cortex-task-graph status  (see full graph)
      /cortex-verify → /cortex-commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STOP-LOSS RULES

1. Any phase produces BLOCKED → halt, report, do not proceed
2. planner produces no approved plan → halt, ask user to clarify
3. tdd-guide coverage < 80% → halt, cover the gaps before reviewer
4. security-reviewer finds CRITICAL → halt, fix before commit

---

## MODEL HINT

Orchestrator (this skill): **Sonnet** — coordination.
Agents: planner=Opus, architect=Opus, others=Sonnet.
Never use Opus for all phases — too slow for complete workflows.
