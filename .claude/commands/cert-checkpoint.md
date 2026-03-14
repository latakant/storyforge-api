╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cortex-checkpoint  |  v1.0  |  TIER: 2  |  BUDGET: LEAN   ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L1 · L3                                              ║
║ AUTHORITY     ║ OBSERVER                                             ║
║ CAN           ║ - Run git commands (stash, log, diff)                ║
║               ║ - Read/write .claude/checkpoints.log                 ║
║               ║ - Run tsc + jest on current state                    ║
║ CANNOT        ║ - Modify source files                                ║
║ WHEN TO RUN   ║ - Start of a feature branch                          ║
║               ║ - Between implementation phases                      ║
║               ║ - Before a risky refactor                            ║
║ OUTPUTS       ║ - Named checkpoint · comparison report               ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Named workflow snapshots. Create at phase boundaries so you can
compare state before/after or roll back to a clean point.

$ARGUMENTS

Parse from $ARGUMENTS:
- `create <name>` — create a named checkpoint
- `verify <name>` — compare current state vs checkpoint
- `list` — list all checkpoints with SHA + status

---

## MODE: create

```bash
# 1. Run quick verification
npx tsc --noEmit 2>&1 | head -5
npx jest --no-coverage --passWithNoTests 2>&1 | tail -5

# 2. Record checkpoint
CHECKPOINT_NAME="$1"
SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "$TIMESTAMP | $CHECKPOINT_NAME | $SHA" >> .claude/checkpoints.log

# 3. Optional: create stash or commit
git stash push -m "checkpoint: $CHECKPOINT_NAME" --include-untracked
```

Report:
```
Checkpoint created: <name>
SHA: <short-sha>
TypeScript: PASS / N errors
Tests: X/Y passed
```

---

## MODE: verify

Compare current state against a named checkpoint:

```bash
CHECKPOINT_LINE=$(grep "$CHECKPOINT_NAME" .claude/checkpoints.log | tail -1)
CHECKPOINT_SHA=$(echo $CHECKPOINT_LINE | cut -d'|' -f3 | xargs)

# Files changed since checkpoint
git diff --name-only $CHECKPOINT_SHA HEAD

# Test delta
git stash show $CHECKPOINT_SHA --stat 2>/dev/null
```

Report:
```
CHECKPOINT COMPARISON: <name>
==============================
Checkpoint SHA:   <sha>
Current SHA:      <sha>
Files changed:    N
Tests now:        X passing / Y failing
Types now:        PASS / N errors
Coverage:         X% (was Y%)
```

---

## MODE: list

```bash
cat .claude/checkpoints.log 2>/dev/null || echo "No checkpoints yet"
```

Output each checkpoint with:
- Name, timestamp, SHA
- Status: current (on this SHA), behind (commits exist after), ahead (SHA no longer in history)

---

## TYPICAL WORKFLOW

```
[Start] → /cortex-checkpoint create "feature-start"
   ↓
[Implement Phase 1] → /cortex-checkpoint create "phase-1-done"
   ↓
[Implement Phase 2] → /cortex-checkpoint verify "phase-1-done"
   ↓
[Ready to ship] → /cortex-checkpoint verify "feature-start"
   ↓
/cortex-verify → /cortex-commit
```

---

## COMPLETION

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-checkpoint             COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode        {create/verify/list}
Name        {checkpoint-name}
Result      {checkpoint created / comparison complete}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
