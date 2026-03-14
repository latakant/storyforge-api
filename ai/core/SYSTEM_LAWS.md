# CORTEX System Laws — Universal Backend Architecture Rules
# Version: 1.1 | Updated: v10.0 (Law 8 added)
# Read by: cert-review (Step 2.8) · cert-predict · cert-plan
#
# These 7 laws apply to every domain-driven backend system regardless of stack.
# Every CORTEX violation report names the law it breaks + the failure scenario.
# "The law exists because X will go wrong at runtime" — not just a style rule.

---

## LAW 1 — Single Source of Truth

**Principle:** Each critical data element is owned by exactly one domain. No other domain writes it directly.

**Ownership map (e-commerce):**
- Product data → Catalog domain
- Stock levels → Inventory domain
- Order lifecycle → Orders domain
- Payment status → Payments domain
- Invoice records → Invoices domain
- User identity → Auth/Users domain

**Failure scenario:** Two domains both update order status independently. Race condition: payments sets CONFIRMED, orders sets CANCELLED at the same moment. Result: inconsistent state, customer charged for cancelled order.

**Detection:** Search for a domain-specific table being written from outside its owning service.
```bash
# Example: orders table written from payments.service.ts
grep -n "prisma\.order\." src/modules/payments/payments.service.ts
```

**Violation output:**
```
[LAW 1 VIOLATED — Single Source of Truth] payments.service.ts:89
  Payments domain is writing to orders table directly.
  Orders data is owned by the Orders domain.
  Failure scenario: concurrent writes from two domains → race condition → inconsistent order state.
  Fix: call ordersService.confirmOrder() or emit OrderPaymentSucceeded event.
```

---

## LAW 2 — Domain Ownership

**Principle:** Domains own their data and rules. Cross-domain interaction happens via service calls or events — never direct DB access across domain boundaries.

**What this means in NestJS:**
- `payments.service.ts` can call `ordersService.updateStatus()` ✓
- `payments.service.ts` cannot call `prisma.order.update()` directly ✗
- `cart.service.ts` can call `productsService.getProduct()` ✓
- `cart.service.ts` cannot call `prisma.product.update()` directly ✗

**Failure scenario:** Payments service directly updates orders table, bypassing the Orders domain's validation logic. A future rule added to order state transitions (e.g. "CONFIRMED orders must have a valid address") is silently bypassed.

**Detection:**
```bash
# Payments writing to orders
grep -n "prisma\.order\." src/modules/payments/
# Cart writing to products
grep -n "prisma\.product\.update\|prisma\.product\.create" src/modules/cart/
```

**Domain boundary map:**
| Domain | Can write | Cannot write |
|--------|-----------|-------------|
| orders | orders, orderItems | products, payments, users |
| payments | payments, processedWebhookEvents | orders (use service call), invoices |
| cart | carts, cartItems | products (use service call), orders |
| catalog | products, categories, variants | inventory/stock, orders, prices |
| auth | users, otps, refreshTokens | orders, payments |

---

## LAW 3 — Immutable Transactions

**Principle:** Historical records (orders, payments, invoices, transactions) must never be modified after creation. Corrections create new records.

**Examples:**
- Order cancelled → create CANCELLED status + new record, never edit the original order status field retroactively without audit trail
- Payment refunded → create new Refund record, never delete or modify Payment record
- Invoice corrected → create credit note, never edit issued invoice
- Wrong price charged → create adjustment record, not UPDATE on original

**Failure scenario:** Invoice edited after issue violates Indian GST law. Payment record modified after creation loses the audit trail needed for dispute resolution.

**Detection:**
```bash
# Invoice being updated after creation (snapshot fields)
grep -n "prisma\.invoice\.update" src/modules/
# Payment record modified
grep -n "prisma\.payment\.update" src/modules/ | grep -v "status"
```

**Violation output:**
```
[LAW 3 VIOLATED — Immutable Transactions] invoices.service.ts:134
  Invoice record is being updated after creation (modifying amount/tax fields).
  Failure scenario: GST law violation — issued invoice cannot change.
  Fix: create a credit note record instead of modifying the original invoice.
```

---

## LAW 4 — State Machines Control Entities

**Principle:** Important entities (orders, payments, shipments) must have explicit states with controlled, validated transitions. No direct status assignment without a guard.

**Order state machine (e-commerce):**
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
    ↓           ↓           ↓
CANCELLED   CANCELLED   CANCELLED
DELIVERED is only reachable from SHIPPED.
REFUNDED is only reachable from DELIVERED or CANCELLED (with payment).
```

**Payment state machine:**
```
PENDING → PAID → REFUNDED
PENDING → FAILED
```

**Forbidden transitions (examples):**
- PENDING → DELIVERED (skipped confirmation and shipping)
- DELIVERED → PENDING (cannot go backwards)
- CANCELLED → CONFIRMED (cannot un-cancel)
- SHIPPED → PENDING (cannot go backwards)

**Failure scenario:** A bug sets order status to DELIVERED without going through SHIPPED. Shiprocket never gets called. Customer marks delivery as received but shipment was never dispatched. Returns become impossible to track.

**Detection:**
```bash
# Status assigned without a transition guard
grep -n "status.*=.*['\"]DELIVERED\|status.*=.*['\"]CONFIRMED" src/modules/orders/
# Check if guard exists above the assignment
```

**Violation output:**
```
[LAW 4 VIOLATED — State Machine] orders.service.ts:201
  Order status set to 'DELIVERED' without transition guard.
  Valid transitions to DELIVERED: SHIPPED → DELIVERED only.
  Failure scenario: order marked delivered without being shipped → no tracking, no returns.
  Fix: add guard — if (order.status !== OrderStatus.SHIPPED) throw new ConflictException(
    'Order must be SHIPPED before DELIVERED'
  )
```

---

## LAW 5 — Side Effects Must Be Isolated

**Principle:** Core business logic must not depend on side effects. If a side effect (email, notification, analytics, search index) fails, the core transaction must not fail with it.

**Correct pattern:**
```
Create order → $transaction completes → emit OrderCreated event
                                             ↓
                              [async] Send confirmation email
                              [async] Update search index
                              [async] Fire analytics event
                              [async] Create shipment in Shiprocket
```

**Wrong pattern:**
```
Create order → send email (inline) → if email fails, order creation fails
```

**Failure scenario:** Email provider (Resend/MSG91) is down. Customer places order. Order creation fails because the inline email call throws. Customer is confused — did the order go through? Money may have been taken. Order does not exist.

**Detection:**
```bash
# Direct mailer/notification call inside $transaction or order creation
grep -n "this\.mailerService\|this\.notificationsService\|this\.smsService" \
  src/modules/orders/orders.service.ts src/modules/payments/payments.service.ts
```

Check if the call is inside an async queue dispatch or is synchronous inline.

**Violation output:**
```
[LAW 5 VIOLATED — Side Effects Isolated] orders.service.ts:167
  Direct mailerService.sendOrderConfirmation() called inside createOrder() method.
  Failure scenario: if email provider is down, order creation fails — customer
  loses their order but may have been charged.
  Fix: dispatch to BullMQ queue after $transaction completes:
    await this.notificationsQueue.add('order-confirmed', { orderId })
```

---

## LAW 6 — Everything Important Is an Event

**Principle:** Every significant business state change should emit a named event. Events allow the system to react without tight coupling between domains.

**Required events (e-commerce):**
| Event | Emitted when | Consumers |
|-------|-------------|-----------|
| `OrderCreated` | New order placed | notifications, inventory, analytics |
| `PaymentSucceeded` | Razorpay webhook confirmed | orders (confirm), invoices (generate) |
| `PaymentFailed` | Payment rejected | notifications, orders (keep PENDING) |
| `OrderConfirmed` | Order moves to CONFIRMED | delivery (create shipment), notifications |
| `OrderShipped` | Shiprocket dispatches | notifications, analytics |
| `OrderDelivered` | Delivery confirmed | notifications, reviews (unlock) |
| `OrderCancelled` | Order cancelled | inventory (restore stock), payments (refund trigger) |
| `StockLow` | Product stock < threshold | admin notifications |

**Failure scenario without events:** To add analytics tracking to order creation, a developer edits `orders.service.ts` directly — adding analytics code into business logic. Over time, orders service becomes a 1000-line monster that owns analytics, notifications, delivery, and invoicing. Untestable, unmaintainable.

**Detection:** Check if critical state changes have corresponding event emissions.
```bash
# OrderCreated event emitted after order creation?
grep -n "OrderCreated\|order-created\|orderCreated" src/modules/orders/orders.service.ts
```

**Violation output:**
```
[LAW 6 VIOLATED — Everything Is an Event] orders.service.ts
  Order creation completes but no OrderCreated event is emitted.
  Without this event: notifications, analytics, and delivery are either
  tightly coupled into this service or missing entirely.
  Fix: after $transaction, emit event:
    await this.eventEmitter.emit('order.created', { orderId, userId, total })
  Or dispatch to BullMQ: await this.ordersQueue.add('order-created', payload)
```

---

## LAW 7 — Systems Fail (Design for Recovery)

**Principle:** Distributed operations will fail partially. Design every multi-step operation to be recoverable: idempotent, retryable, and with compensating actions for partial failures.

**The three recovery patterns:**

**Idempotency:** The same operation can be called multiple times with the same result.
```typescript
// ProcessedWebhookEvent check — if already processed, skip silently
const existing = await prisma.processedWebhookEvent.findUnique({
  where: { paymentId }
})
if (existing) return // idempotent — safe to retry
```

**Retry queues:** Failed async operations are retried automatically.
```typescript
// BullMQ processor MUST re-throw — otherwise job is marked complete despite failure
async process(job: Job) {
  try {
    await this.sendEmail(job.data)
  } catch (err) {
    throw err // re-throw → BullMQ retries → DLQ after max attempts
  }
}
```

**Saga / compensating transactions:** When step N fails, undo steps 1..N-1.
```
Order creation saga:
  Step 1: Create order record
  Step 2: Decrement stock
  Step 3: Create payment

  If Step 3 fails: compensate Steps 1+2 (delete order, restore stock)
  Solution: wrap all 3 in prisma.$transaction — automatic rollback on failure
```

**Failure scenario:** Payment webhook arrives. Razorpay marks payment PAID. The webhook handler updates payment status to PAID but then fails before updating order status to CONFIRMED. User paid but order is stuck in PENDING forever. No retry, no compensation.

**Detection:**
```bash
# Webhook handler with multiple DB writes — check for $transaction wrapping
grep -n "prisma\." src/modules/payments/payments.service.ts | grep -v "$transaction"
# BullMQ processor without re-throw
grep -n "catch" src/modules/*/processors/*.ts -A 3 | grep -v "throw"
```

**Violation output:**
```
[LAW 7 VIOLATED — Design for Recovery] payments.service.ts:134
  Webhook handler updates payment status (line 134) and order status (line 141)
  in separate Prisma calls without $transaction.
  Failure scenario: payment marked PAID, then server crashes before order CONFIRMED.
  Customer charged, order stays PENDING forever. No automatic recovery.
  Fix: wrap both updates in prisma.$transaction(async tx => { ... })
  Also: ensure ProcessedWebhookEvent is written inside same transaction (idempotency).
```

---

## LAW 8 — Project Isolation

**Principle:** Every project is isolated and self-contained. No project knows another project exists. No project references another project's path, imports its code, or reads its files.

**The one exception:** `C:\luv\Cortex` (or wherever the Cortex framework lives) is the only shared resource. It is a framework, not a project.

**What this means in practice:**
- Every project gets its own local `ai/` + `.claude/` installed via `cortex-setup`
- `ai/` and `.claude/` are gitignored in every project — they never get committed
- Stray files from Project B must never exist inside Project A's directory
- Project names, paths, and configs are never hardcoded in another project's files

**Directory structure this law enforces:**
```
C:\luv\
  ├── Cortex/          ← ONLY shared resource — framework source
  ├── project-a/       ← isolated · self-contained · own ai/ + .claude/
  ├── project-b/       ← isolated · self-contained · own ai/ + .claude/
  └── project-c/       ← isolated · self-contained · own ai/ + .claude/
```

**Gitignore requirement (every project, no exceptions):**
```gitignore
# CORTEX governance — local only, never committed
ai/
.claude/
```

**Failure scenario:** A developer working on `tailorgrid-api` accidentally finds an `exena-api` path hardcoded in their environment config. The system now has an implicit dependency between two unrelated products. Cloning `tailorgrid-api` on a machine without `exena-api` causes silent failures.

**Detection:**
```bash
# Scan for cross-project path references
grep -rn "exena-api\|exena-web\|exena-admin\|tailorgrid" \
  --include="*.ts" --include="*.json" --include="*.env*" \
  src/ prisma/ scripts/ 2>/dev/null
```

**Violation output:**
```
[LAW 8 VIOLATED — Project Isolation] .env:4
  DATABASE_URL references path from another project (exena-api).
  Failure scenario: project cannot be cloned and run independently.
  Fix: use a project-local value. Remove all cross-project path references.
```

**Session check:** At `/cortex-connect`, verify:
1. `ai/` is in this project's `.gitignore`
2. `.claude/` is in this project's `.gitignore`
3. No other project's name appears in tracked files
