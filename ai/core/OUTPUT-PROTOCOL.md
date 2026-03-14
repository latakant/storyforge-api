# CORTEX OUTPUT PROTOCOL v1.0
# Standard output format for all Cortex skill execution.
# Every skill response must follow this structure.

---

## Structure

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — {Task Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/N] {Step description}
→ {Action detail}
✓ {Result}

[2/N] {Step description}
→ {Action detail}
✓ {Result}

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : COMPLETE
Duration: Xs
Next    : {what happens now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Status Icons

| Icon | Meaning |
|------|---------|
| `→`  | action in progress |
| `✓`  | success |
| `✗`  | failure |
| `⚠`  | warning / partial |
| `•`  | info / neutral |

---

## Happy Path Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Restart API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Detect running process
→ Scanning port 4000
✓ PID 2760 found

[2/4] Terminate existing server
→ Sending kill signal to PID 2760
✓ Process terminated

[3/4] Start NestJS application
→ Boot sequence initiated
✓ Application loaded

[4/4] Verify health endpoint
→ GET /api/health
✓ 200 OK — server ready

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : COMPLETE
Duration: 4.1s
Next    : API accepting requests on port 4000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Failure Path Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Restart API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Detect running process
→ Scanning port 4000
✓ PID 2760 found

[2/4] Terminate existing server
→ Sending kill signal to PID 2760
✓ Process terminated

[3/4] Start NestJS application
→ Boot sequence initiated
✗ Application crashed on startup

[4/4] Verify health endpoint
• Skipped — server did not start

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : FAILED at step 3/4
Reason : DATABASE_URL missing from environment
Fix    : Add DATABASE_URL to .env then run /cortex-server restart
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Warning Path Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORTEX — Run Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/3] Compile TypeScript
✓ 0 errors

[2/3] Run unit tests
⚠ 196 passed · 3 skipped · 0 failed

[3/3] Generate coverage report
✓ 84% coverage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATUS : COMPLETE WITH WARNINGS
Next   : Review 3 skipped tests in orders.service.spec.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Rules

1. Every skill output starts with the `━━━` header block.
2. Steps are always numbered `[current/total]`.
3. Every step has: description → action → result. Never skip result.
4. On failure: show exact step that failed, the reason, and a fix command.
5. Skipped steps (due to earlier failure) use `•` and say "Skipped".
6. Completion block always includes: STATUS · reason or next action.
7. No raw terminal output in the main flow — translate it to human language.
8. Raw logs (if needed) go after the completion block under a `--- Raw Output ---` separator.
