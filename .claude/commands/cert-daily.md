╔══════════════════════════════════════════════════════════════════════╗
║  CORTEX  /cert-daily  |  v1.0  |  TIER: 1  |  BUDGET: LEAN         ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L0 (Maintenance Gate)                                ║
║ AUTHORITY     ║ ANALYST + GODFATHER                                  ║
║ CAN           ║ - Scan all project instincts.json files               ║
║               ║ - Read adapter file headers for version drift        ║
║               ║ - Diff installed skills vs source                    ║
║               ║ - Read SUGGESTIONS.md for pending P1 items           ║
║               ║ - Promote ready instincts to adapter files           ║
║ CANNOT        ║ - Modify project source code                         ║
║               ║ - Run tests or deploy                                ║
║ WHEN TO RUN   ║ - Start of every working day                         ║
║               ║ - Before any cert-build/fix/feature session          ║
║ OUTPUTS       ║ - Daily maintenance report                           ║
║               ║ - Action list for human approval                     ║
╚═══════════════╩══════════════════════════════════════════════════════╝

**The Godfather's daily 10-minute gate.**
Cortex degrades silently without this. Run it. Act on the output.

---

## STEP 1 — Instinct Promotion Sweep (5 min)

Scan all active project instincts.json files for pending promotions.

Active project paths (check CLAUDE.md for current list):
```
C:\luv\exena\ai\learning\instincts.json
C:\luv\ledgrpay\ai\learning\instincts.json
C:\luv\slotbook\ai\learning\instincts.json
C:\luv\storyforge\ai\learning\instincts.json
C:\luv\tailorgrid\ai\learning\instincts.json
C:\luv\teambase\ai\learning\instincts.json
```

For each file, find entries where ALL of these are true:
- `promote_to_cortex` is NOT null
- `promoted_at` is missing or null
- `graduated: true` OR `confidence >= 0.9`

For each match:
```
📌 PENDING PROMOTION
   Project:  [project name]
   ID:       [instinct id]
   Name:     [instinct name]
   Target:   C:\luv\Cortex\[promote_to_cortex path]
   Pattern:  [anti_pattern -> correct_pattern summary]
   Action:   → Promote now? [yes/no]
```

If human says yes → execute promotion (append law to adapter, mark promoted_at).
If nothing found: `✅ Instinct sweep: 0 pending promotions`

---

## STEP 2 — Watch List Drain (3 min)

Read `C:\luv\Cortex\SUGGESTIONS.md`.

Find the first S-00X entry where:
- Status is PROPOSED
- Priority is P1 or P2
- It is actionable today (no blockers)

Present it:
```
🎯 SUGGESTED ACTION TODAY
   Suggestion: [S-00X] [title]
   Why now:    [reason from suggestion file]
   Action:     [what to do — write law / build skill / etc.]
   → Execute? [yes/no]
```

If human says yes → execute.
If human says no → move to next suggestion.

---

## STEP 3 — Adapter Freshness Scan (2 min)

Read framework versions declared in CLAUDE.md for the current active project.
Compare against the `Stack:` line in each adapter file header.

```
Current project stack (from CLAUDE.md):
  Next.js: 15.5
  NestJS:  10.4
  Prisma:  6.19

Adapter coverage:
  nextjs-patterns.md  → Stack: Next.js 15.5 App Router  ✅ current
  nestjs-patterns.md  → Stack: NestJS 10.x               ✅ current
  prisma-patterns.md  → Stack: Prisma 5.x                ⚠️ STALE (project on 6.19)
```

If stale: flag for manual review. Do not auto-update adapter content — review breaking changes first.

---

## STEP 4 — Skill Drift Check (2 min)

Pick ONE skill from the active project's `.claude/commands/` directory.
Diff it against the source in `C:\luv\Cortex\skills\`.

```bash
diff C:\luv\Cortex\skills\cert-enforce.md [project]\.claude\commands\cert-enforce.md
```

If diverged:
```
⚠️ SKILL DRIFT DETECTED
   Skill:   cert-enforce
   Project: exena
   Diff:    [summary of changes]
   Action:  Propagate update? [yes/no]
```

If in sync: `✅ Skill drift: [skill-name] in sync`

---

## STEP 5 — Status Staleness (1 min)

Read `C:\luv\Cortex\STATUS.md`.

Flag any project where `Last Checked` is more than 7 days ago:
```
⚠️ STALE STATUS: [project] — last checked [date] ([N] days ago)
   → Run cert-verify to refresh score? [yes/no]
```

---

## STEP 6 — Orphaned Skill Catalogue (optional · 1 min)

Run only if you see skill noise in `.claude/commands/` or are planning a Cortex cleanup session.

The following skills have no trigger in any standard workflow sequence.
They are NOT deprecated — they are available for specific situations but won't surface automatically:

```
OPTIONAL / SITUATIONAL (invoke manually when needed):
  cert-audit       → full enterprise governance audit (use before major release)
  cert-checkpoint  → progress snapshot (use mid-sprint if context gets long)
  cert-compact     → strategic context compaction at phase boundaries (NOT auto-compact)
  cert-predict     → risk prediction (use before high-risk changes)
  cert-diagram     → update living blueprint diagram (use after architecture changes)
  cert-discover    → project intelligence scan (use on unknown/new projects)
  cert-demo        → demo-ready state check (use before client demos)
  cert-index       → code index rebuild (use after major refactors)
  cert-changelog   → changelog generation (use before release)
  cert-env         → environment validation (use on new machine / environment issues)
  cert-handoff-plan → handoff documentation (use when switching developers)
  cert-assign      → task assignment (use in team context)

DEPRECATED:
  cert-session     → DEPRECATED. Use /start instead.
  exena-live       → DEPRECATED. Exena-specific, not portable.
```

No action required unless you're doing a Cortex cleanup session.

---

## COMPLETION OUTPUT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY MAINTENANCE REPORT — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instinct promotions:  [N pending / 0 pending]
Watch list drain:     [item actioned / skipped]
Adapter freshness:    [all current / N stale]
Skill drift:          [in sync / N diverged]
Status staleness:     [all fresh / N stale]

Actions taken today:
  [list of what was done]

Actions deferred:
  [list of what was skipped]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT CERT-DAILY: tomorrow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## INSTALL

```bash
# Install to a project (replace [project] with target path)
cp C:\luv\Cortex\skills\cert-daily.md [project]\.claude\commands\cert-daily.md
```

Tier 1 skill — install to all 9 active Cortex projects.
