<!-- Load ai/core/MASTER-v7.3.md before executing this skill -->
Print the full CORTEX skill directory. No context loading required.

---

```
CORTEX SKILL DIRECTORY — [today's date]
══════════════════════════════════════════════════════════════════

SESSION
  Full context load + Session Brief     /cortex-session
  Quick score + blockers only           /cortex-status
  Work type classification + roles      /cortex-roles [analyse|log|handoff]
  Environment validation                /cortex-init
  This directory                        /cortex-help

DAILY DEVELOPMENT
  Fix a bug                BUG:         /cortex-bug
  Add a feature            FEATURE:     /cortex-feature
  Modify behaviour         MODIFY:      /cortex-modify
  Remove something         REMOVE:      /cortex-remove
  Close open issue         FIX:         /cortex-fix [ISSUE-ID]
  Diagnose requestId       DIAGNOSE:    /cortex-diagnose [requestId]
  Upgrade dependency                    /cortex-upgrade
  Analyse → score → gate → execute      /cortex-analyse [--report-only | --execute saved]

SPEC + GENERATION
  Extract spec from code                /cortex-extract [all | <module> | validate]
  Generate code from spec               /cortex-generate [full | delta | preview | <entity>]
  Manage spec lifecycle                 /cortex-spec [init | propose | diff | approve]
  Generate/refresh PRD                  /cortex-prd
  Universal project intelligence scan   /cortex-discover
  Propose new project (greenfield)      /cortex-propose [greenfield | existing | upgrade]

BACKEND (exena-api)
  Load module context        /dev-backend-context [module]
  Add API endpoint           /dev-backend-endpoint
  Prisma schema change       /dev-backend-schema
  Write/fix unit tests       /dev-backend-test [module] [audit|write|fix]
  Debug NestJS issue         /dev-backend-debug

FRONTEND (exena-web / exena-admin)
  Load frontend context      /dev-frontend-context [web|admin]
  Add Next.js page           /dev-frontend-page
  Build Radix UI component   /dev-frontend-component
  Add API service function   /dev-frontend-service
  Debug frontend issue       /dev-frontend-debug
  Standards audit (scored)   /dev-frontend-lint [path]

FULLSTACK
  End-to-end feature         /dev-fullstack-feature
  Cross-layer debug          /dev-fullstack-debug

E-COMMERCE (India)
  Orders domain              /ecom-orders
  Payments + Razorpay        /ecom-payments
  Cart + coupons             /ecom-cart
  Inventory management       /ecom-inventory
  GST + tax                  /ecom-tax

INTELLIGENCE
  3-tier bug resolution      /dev-debugger [error or requestId]
  Coverage audit + tests     /dev-tester [module] [audit|write|fix]

DOMAIN BUILD
  Generate domain skeleton   /cortex-build <domain>
  Run isolated sub-agents    /cortex-task <skill> [args]

GOVERNANCE + CLOSING
  Commit with governance     /cortex-commit
  Safely undo a fix          /cortex-rollback [FIX-ID optional]
  Document a blocker         /cortex-stuck
  Update master diagram      /cortex-diagram
  Log lifecycle manually     /cortex-lifecycle
  Enterprise score           /cortex-score
  Intelligence cycle         /cortex-learn
  Full governance audit      /cortex-audit
  Founder brief + workload   /cortex-report
  Clean stale files          /cortex-clean [--stale | --repo | --dry-run]

══════════════════════════════════════════════════════════════════
Total: 51 skills  |  All live in .claude/commands/

Quick patterns:
  New session    → /cortex-session → /cortex-roles analyse → work → /cortex-commit
  Bug reported   → /cortex-bug  (auto-captures pattern to pending-patterns.json)
  New project    → /cortex-discover → /cortex-extract → /cortex-prd → /cortex-spec
  3+ builds      → /cortex-task (isolated sub-agents, prevents context rot)
  Tests missing  → /dev-tester [module]
  Can't resolve  → /cortex-stuck (never leave session unlogged)
  Undo a fix     → /cortex-rollback
  Task unclear   → /cortex-roles analyse (classifies work type + active role)
  Repo messy     → /cortex-clean (interactive — never auto-deletes)

Intelligence grows every time /cortex-bug is used.
The more consistently, the faster the system matures.
══════════════════════════════════════════════════════════════════
```

---

## Completion block (RESPONSE_PROTOCOL.md)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX  /cortex-help                    COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Skills     51 available  |  All live in .claude/commands/
Next       /cortex-session (new session) | pick a skill above
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
