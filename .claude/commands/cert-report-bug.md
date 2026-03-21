╔══════════════════════════════════════════════════════════════════════╗
║  CERT  /cert-report-bug  |  v1.0  |  TIER: 3  |  BUDGET: MODERATE  ║
╠═══════════════╦══════════════════════════════════════════════════════╣
║ LAYER SCOPE   ║ L2 (Domain) + L7 (Impl) + L8 (Runtime)             ║
║ AUTHORITY     ║ ANALYST → EXECUTOR                                  ║
║ CAN           ║ - Read BUG-REPORT.md (or pasted report content)     ║
║               ║ - Read source files referenced in the report        ║
║               ║ - Read docker/server logs                           ║
║               ║ - Run grep/tsc to confirm root cause                ║
║               ║ - Classify bug type and route to cert-fix           ║
║               ║ - Append to ai/learning/pending-patterns.json       ║
║ CANNOT        ║ - Write code (delegates to cert-fix)                ║
║               ║ - Modify schema without expand-contract             ║
║               ║ - Skip classification — routing without             ║
║               ║   reading all 3 key sections is a HARD HALT         ║
║ REQUIRES      ║ - Filled BUG-REPORT.md OR pasted report content     ║
║ ESCALATES     ║ - Auth/payment bug → flag CRITICAL before routing   ║
║               ║ - Unknown pattern → append to pending-patterns.json ║
║               ║ - Score < 85 after fix → flag before cert-commit    ║
║ OUTPUTS       ║ - Bug class + root cause (file:line)                ║
║               ║ - Routed fix command ready to run                   ║
║               ║ - Pattern capture entry (if novel bug class)        ║
╚═══════════════╩══════════════════════════════════════════════════════╝

Bridge between DEV-TEST-GUIDE.md and cert-fix.
Dev fills BUG-REPORT.md → pastes to Claude → /cert-report-bug reads it →
classifies the bug → finds the root cause → hands off to cert-fix.

This skill reads what the DEVELOPER sees (browser + network + logs)
and translates it into what CORTEX needs (file + line + fix class).

$ARGUMENTS
Parse from $ARGUMENTS:
- path to BUG-REPORT.md (e.g. /cert-report-bug BUG-REPORT.md)
- OR: no argument → read bug report from the current message/conversation

---

## STEP 1 — Read the Bug Report

If $ARGUMENTS contains a file path: Read the file at that path.
If no argument: extract the bug report content from the current conversation context.

Parse and extract these fields. If any of the 3 KEY fields are missing or blank,
output a request for that field before proceeding — do NOT guess:

```
KEY FIELD 1 — Console Errors (Section 5)
  What the browser DevTools Console tab shows (red errors, stack traces)

KEY FIELD 2 — Network Error (Section 6)
  The failed HTTP request: URL + method + status code + response body

KEY FIELD 3 — API Logs (Section 7)
  Output of: docker compose logs api --tail=50
```

If all 3 are blank/empty:
```
⚠ CERT-REPORT-BUG — WAITING FOR INPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Missing the 3 key diagnostic fields. Please provide:

  1. Browser console errors (F12 → Console → red errors)
     Paste here: ________________________________

  2. Failed network request (F12 → Network → click failed request → Response)
     URL + status + response body: ________________________________

  3. API server logs
     Run: docker compose logs api --tail=50
     Paste here: ________________________________

These 3 fields let Cortex find the root cause in under 60 seconds.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Stop and wait. Do not continue until at least 2 of the 3 are provided.

Also extract (secondary — used for routing, not required to continue):
- Summary (Section 1)
- Page / Route (Section 2)
- App: Admin | Storefront | API (Section 2)
- Steps to reproduce (Section 3)

---

## STEP 2 — Classify the Bug Type

Read the 3 key fields and classify into exactly ONE primary bug type:

```
TYPE A — API_MISMATCH
  Signals: Network error shows 404 on a known route, or method mismatch (GET vs POST)
  Meaning: Frontend is calling a URL/method that doesn't exist on the backend
  Example: PATCH /api/orders/admin/:id/status → 404 "Cannot PATCH"

TYPE B — FRONTEND_CRASH
  Signals: Console error with TypeError / Cannot read properties of undefined / null
           OR: blank white screen with React error boundary
  Meaning: Frontend component tried to use data that wasn't there yet
  Example: TypeError: Cannot read properties of undefined (reading 'map')

TYPE C — BACKEND_EXCEPTION
  Signals: Network shows 500 Internal Server Error
           API logs show: [Nest] ERROR [ExceptionsHandler] ...
  Meaning: Backend threw an unhandled exception
  Example: PrismaClientKnownRequestError: P2025 Record not found

TYPE D — AUTH_FAILURE
  Signals: Network shows 401 Unauthorized or 403 Forbidden
           API logs show: UnauthorizedException or ForbiddenException
  Meaning: Token missing/expired, wrong role, guard blocking
  Example: 401 on /api/orders/admin/all — token expired

TYPE E — VALIDATION_ERROR
  Signals: Network shows 400 Bad Request
           Response body contains: {"message": ["field must be..."], "statusCode": 400}
  Meaning: DTO validation rejected the request payload
  Example: addressId must be a UUID (when CUID was sent)

TYPE F — DATA_MISSING
  Signals: Page loads but shows empty state or "not found" when data should exist
           Network shows 200 but response is empty array or null
  Meaning: Query filter is wrong, wrong ID, data not seeded, soft-deleted
  Example: Orders list shows 0 orders but DB has records

TYPE G — STATE_SYNC
  Signals: UI doesn't update after an action (save, delete, status change)
           No error in console or network, action returns 200
  Meaning: React Query cache not invalidated after mutation
  Example: Status badge stays PENDING after selecting CONFIRMED
```

Output the classification:
```
BUG TYPE: [TYPE X — NAME]
Confidence: HIGH | MEDIUM | LOW
Signal:     [what in the report confirmed this type]
```

If confidence is LOW or two types fit equally:
- List both candidates
- Ask dev: "Which describes it better — [TYPE A description] or [TYPE G description]?"
- Wait for answer before proceeding

---

## STEP 3 — Find the Root Cause

Based on the bug type, read the relevant source files:

**TYPE A — API_MISMATCH:**
```
1. Extract the failing URL from the network error
   e.g. PATCH /api/orders/admin/:id/status
2. Find the controller file:
   grep -r "admin" apps/api/src/modules/orders/ --include="*.controller.ts"
3. Read the controller — check if the route exists and if method matches
4. Check route ordering — static routes must be before parametric ones
   e.g. admin/all must come before admin/:id
Root cause output: "Route PATCH admin/:id/status missing from OrdersController"
Fix: add the missing route
```

**TYPE B — FRONTEND_CRASH:**
```
1. Extract the file and line from the stack trace
   e.g. page.tsx:171:32
2. Read that file at that line
3. Find what property is being accessed on undefined/null
4. Check: is the data still loading? is it optional? is the API returning null?
Root cause output: "order.items accessed before order loads — missing optional chaining"
Fix: add ?. or loading guard
```

**TYPE C — BACKEND_EXCEPTION:**
```
1. Extract the error from API logs — get the Prisma code or exception class
2. Find the service method being called (from the failing endpoint)
3. Read the service method — find the missing try/catch or wrong Prisma query
Common Prisma codes:
  P2025 → record not found → throw NotFoundException
  P2002 → unique constraint → throw ConflictException
Root cause output: "findOneAdmin throws P2025 uncaught — needs NotFoundException"
Fix: wrap in try/catch with proper error mapping
```

**TYPE D — AUTH_FAILURE:**
```
1. Check: is the token being sent? (Network tab → request headers → Authorization)
2. Check: does the route have the correct guards?
   grep -r "RolesGuard\|JwtAuthGuard" apps/api/src/modules/<module>/
3. Check: does the user's role match the @Roles() decorator?
Root cause output: "Route missing @UseGuards(JwtAuthGuard) — all requests rejected as 401"
Fix: add missing guard or fix role requirement
```

**TYPE E — VALIDATION_ERROR:**
```
1. Read the DTO for the failing endpoint
   grep -r "Dto" apps/api/src/modules/<module>/dto/
2. Find the field that's failing validation
3. Check if validator matches what frontend sends
   Common: @IsUUID() rejecting CUID — fix to @IsString()
Root cause output: "addressId decorated @IsUUID() but frontend sends CUID — use @IsString()"
Fix: change validator to @IsString()
```

**TYPE F — DATA_MISSING:**
```
1. Check the service query — is there a filter that's too narrow?
2. Check if isActive soft-delete is filtering out records
3. Check if the userId/tenantId filter is wrong
Root cause output: "findAllAdmin filters by userId but userId param not in QueryDto"
Fix: add userId to DTO + where clause
```

**TYPE G — STATE_SYNC:**
```
1. Read the mutation in the frontend page
2. Check onSuccess — is queryClient.invalidateQueries called?
3. Check the queryKey — does it match the list query's queryKey exactly?
Root cause output: "updateStatusMutation onSuccess missing invalidateQueries(['orders'])"
Fix: add invalidateQueries call with correct key
```

Output:
```
ROOT CAUSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File:    [file path]
Line:    ~[line number]
Cause:   [one sentence: what is wrong and why]
Class:   [route missing | null access | uncaught prisma | guard missing |
          wrong validator | missing filter | missing invalidation]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 4 — Security Escalation Check

Before routing to fix — check if this bug touches a sensitive domain:

```
If bug is in any of these areas → flag CRITICAL before proceeding:
  · Payment processing (Razorpay, COD, webhooks)
  · Authentication / token handling
  · HMAC signature verification
  · User data access (cross-user data leak possible?)
  · Admin routes accessible without auth

Flag output:
⚠ SECURITY FLAG — this bug touches [payment|auth|data access]
  Root cause must be reviewed before cert-fix runs.
  Recommend: security-reviewer agent after fix is applied.
```

If not security-sensitive: proceed silently.

---

## STEP 5 — Check Pattern Library

Query ai/patterns/<domain>.json and ai/learning/instincts.json
to check if this bug class has been seen before:

```bash
# domain = orders | auth | payments | frontend | validation | etc.
cat ai/patterns/<domain>.json 2>/dev/null | grep -i "<bug class keyword>"
cat ai/learning/instincts.json 2>/dev/null | grep -i "<bug class keyword>"
```

If KNOWN pattern found:
```
KNOWN PATTERN MATCH
Pattern: [pattern name]
Confidence: [score]
This bug class has been seen before. Prescribed fix:
[fix from pattern]
```

If UNKNOWN (not in any pattern file):
- Flag for capture in Step 6

---

## STEP 6 — Route to Fix

Output the ready-to-run fix command:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNOSIS COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bug Type:    [TYPE X — NAME]
Root Cause:  [file:line — one sentence]
Fix Class:   [route missing | null guard | error mapping | guard | validator | cache]
Security:    [NONE | FLAGGED — review after fix]
Pattern:     [KNOWN: <name> | UNKNOWN — will capture]

Ready to fix. Run:
  /cert-fix "[root cause description]"

Example:
  /cert-fix "PATCH /orders/admin/:id/status missing from OrdersController"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If UNKNOWN pattern → also append to ai/learning/pending-patterns.json:
```json
{
  "id": "pending-[timestamp]",
  "bug_class": "[class name]",
  "symptom": "[what the dev saw]",
  "root_cause": "[what was actually wrong]",
  "fix_applied": "[what cert-fix will do]",
  "source": "cert-report-bug",
  "promoted": false,
  "confidence": 0.3,
  "evidence_count": 1
}
```

---

## Completion Block

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      cert-report-bug
STATUS:     COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bug Type:   [TYPE X — NAME]
File:       [file:line]
Cause:      [one sentence]
Security:   [NONE | FLAGGED]
Pattern:    [KNOWN | UNKNOWN — captured]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT:       /cert-fix "[root cause]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If report is too incomplete to classify (all 3 key fields missing):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SKILL:      cert-report-bug
STATUS:     WAITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Missing:    Console errors + Network error + API logs
Action:     Fill BUG-REPORT.md sections 5, 6, 7
            Then paste back here
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
